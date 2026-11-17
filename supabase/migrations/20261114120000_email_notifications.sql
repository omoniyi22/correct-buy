-- Queue more transactional emails through notification_logs (drained by src/lib/email.server.ts):
--   welcome            -> new customer, once their email is confirmed
--   contact_received   -> auto-reply to someone who used the contact form
--   admin_contact_message -> alert to the store's support_email
--   newsletter_welcome -> new newsletter subscriber
-- Non-order emails carry their data in notification_logs.payload.

ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Every trigger below swallows its own errors so an email problem can never block signup, contact or subscribe.

CREATE OR REPLACE FUNCTION public.queue_welcome_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.notification_logs WHERE channel = 'email' AND event = 'welcome' AND recipient = NEW.email) THEN RETURN NEW; END IF;
  INSERT INTO public.notification_logs (channel, event, recipient, payload)
  VALUES ('email', 'welcome', NEW.email, jsonb_build_object('name', split_part(coalesce(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1)));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_welcome_email() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_welcome ON auth.users;
CREATE TRIGGER on_auth_user_welcome AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.queue_welcome_email();

CREATE OR REPLACE FUNCTION public.queue_contact_emails() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE support text;
BEGIN
  -- At most one auto-reply per address per hour, so the form can't be used to mail-bomb someone.
  IF NOT EXISTS (SELECT 1 FROM public.notification_logs WHERE channel = 'email' AND event = 'contact_received' AND recipient = NEW.email AND created_at > now() - interval '1 hour') THEN
    INSERT INTO public.notification_logs (channel, event, recipient, payload)
    VALUES ('email', 'contact_received', NEW.email, jsonb_build_object('name', NEW.name, 'message', left(NEW.message, 1000)));
  END IF;
  SELECT support_email INTO support FROM public.store_settings WHERE id = 1;
  IF support IS NOT NULL AND support LIKE '%@%' THEN
    INSERT INTO public.notification_logs (channel, event, recipient, payload)
    VALUES ('email', 'admin_contact_message', support, jsonb_build_object('name', NEW.name, 'email', NEW.email, 'message', left(NEW.message, 3000)));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_contact_emails() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_contact_message_email ON public.contact_messages;
CREATE TRIGGER on_contact_message_email AFTER INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.queue_contact_emails();

CREATE OR REPLACE FUNCTION public.queue_newsletter_welcome() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_logs (channel, event, recipient) VALUES ('email', 'newsletter_welcome', NEW.email);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_newsletter_welcome() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_newsletter_signup_email ON public.newsletter_signups;
CREATE TRIGGER on_newsletter_signup_email AFTER INSERT ON public.newsletter_signups
  FOR EACH ROW EXECUTE FUNCTION public.queue_newsletter_welcome();
