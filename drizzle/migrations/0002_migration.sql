
CREATE POLICY "staff read product images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "staff upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "staff delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "customers upload own return photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'return-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "return photos read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'return-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));

INSERT INTO public.categories (slug, name, description, sort) VALUES
 ('audio', 'Audio', 'Headphones, earbuds and speakers we actually listen to.', 1),
 ('wearables', 'Wearables', 'Smartwatches and trackers that last the week.', 2),
 ('footwear', 'Footwear', 'Runners and boots built for real miles.', 3),
 ('bags', 'Bags & Leather', 'Backpacks and wallets that age well.', 4);

INSERT INTO public.suppliers (name, contact_name, email, phone, integration_type, lead_time_days, notes) VALUES
 ('SoundHub Distribution', 'Tunde Bello', 'orders@soundhub.example', '+234 801 111 1111', 'email', 2, 'Audio gear, Lagos warehouse'),
 ('Stride & Co. Footwear', 'Amaka Obi', 'po@stride.example', '+234 802 222 2222', 'manual', 4, 'Call before 2pm for same-week dispatch'),
 ('LeatherWorks Aba', 'Chidi Nwosu', 'sales@leatherworks.example', '+234 803 333 3333', 'csv', 5, 'Weekly CSV batch');

WITH c AS (SELECT slug, id FROM public.categories)
INSERT INTO public.products (slug, name, brand, category_id, description, specs, image_url, featured) VALUES
 ('pulse-headphones', 'Pulse ANC Headphones', 'Pulse', (SELECT id FROM c WHERE slug='audio'), 'Noise cancelling, 40-hour battery and pillow-soft ear cushions for all-day listening.', '[{"k":"Battery","v":"40 hours"},{"k":"Connection","v":"Bluetooth 5.3"},{"k":"Weight","v":"250 g"}]', '/__l5e/assets-v1/c2aa153e-ef37-4304-b0de-ce2b73a6b879/p-headphones.jpg', true),
 ('orbit-watch', 'Orbit Smartwatch', 'Orbit', (SELECT id FROM c WHERE slug='wearables'), 'Steel case, heart-rate tracking and a week of battery on a single charge.', '[{"k":"Battery","v":"7 days"},{"k":"Water resistance","v":"5 ATM"},{"k":"Case","v":"Stainless steel"}]', '/__l5e/assets-v1/ddbf6edf-9e3f-4c0f-865d-2494374d12d1/p-watch.jpg', true),
 ('stride-runner', 'Stride Runner', 'Stride', (SELECT id FROM c WHERE slug='footwear'), 'Breathable mesh upper with a responsive foam sole made for daily miles.', '[{"k":"Upper","v":"Engineered mesh"},{"k":"Drop","v":"8 mm"}]', '/__l5e/assets-v1/22101353-d64a-4d61-b2e2-25abf456179e/p-sneaker.jpg', true),
 ('metro-backpack', 'Metro Leather Backpack', 'LeatherWorks', (SELECT id FROM c WHERE slug='bags'), 'Full-grain leather, padded laptop sleeve and smooth metal zips.', '[{"k":"Fits","v":"Up to 15 inch laptop"},{"k":"Volume","v":"20 L"}]', '/__l5e/assets-v1/0651aa6a-7e6f-425e-a4e7-05ac810d5483/p-backpack.jpg', true),
 ('echo-buds', 'Echo Wireless Earbuds', 'Pulse', (SELECT id FROM c WHERE slug='audio'), 'Pocket-size earbuds with clear calls, punchy bass and 30 hours with the case.', '[{"k":"Battery","v":"6 h + 24 h case"},{"k":"Water resistance","v":"IPX4"}]', '/__l5e/assets-v1/1cad1535-8270-4f61-ba64-e8b074a5a1f0/p-earbuds.jpg', false),
 ('boom-mini-speaker', 'Boom Mini Speaker', 'SoundHub', (SELECT id FROM c WHERE slug='audio'), 'Loud little speaker with a carry loop, splash-proof fabric and 12-hour battery.', '[{"k":"Battery","v":"12 hours"},{"k":"Water resistance","v":"IP67"}]', '/__l5e/assets-v1/3721a96a-07e0-4b55-811c-ae26b22af029/p-speaker.jpg', false),
 ('ridge-hiking-boot', 'Ridge Hiking Boot', 'Stride', (SELECT id FROM c WHERE slug='footwear'), 'Waterproof suede boot with a grippy lugged sole for weekend trails.', '[{"k":"Upper","v":"Suede, waterproof lining"},{"k":"Sole","v":"Rubber lug"}]', '/__l5e/assets-v1/2ad06cfa-e340-4acd-928b-0ea790630288/p-boots.jpg', false),
 ('classic-bifold-wallet', 'Classic Bifold Wallet', 'LeatherWorks', (SELECT id FROM c WHERE slug='bags'), 'Slim hand-stitched leather wallet with six card slots and a note pocket.', '[{"k":"Card slots","v":"6"},{"k":"Leather","v":"Full-grain"}]', '/__l5e/assets-v1/8be745ec-4799-47b3-920e-34b5e7d44850/p-wallet.jpg', false);

WITH p AS (SELECT slug, id FROM public.products), s AS (SELECT name, id FROM public.suppliers)
INSERT INTO public.product_variants (product_id, sku, name, option_color, option_size, price, compare_at_price, supplier_id, supplier_sku, cost_price, lead_time_days, qty_on_hand, low_stock_threshold, sort) VALUES
 ((SELECT id FROM p WHERE slug='pulse-headphones'), 'PUL-ANC-BLK', 'Black', 'Black', NULL, 18900000, 21500000, (SELECT id FROM s WHERE name='SoundHub Distribution'), 'SH-PA-001', 12000000, 2, 24, 5, 1),
 ((SELECT id FROM p WHERE slug='pulse-headphones'), 'PUL-ANC-SND', 'Sand', 'Sand', NULL, 18900000, NULL, (SELECT id FROM s WHERE name='SoundHub Distribution'), 'SH-PA-002', 12000000, 2, 3, 5, 2),
 ((SELECT id FROM p WHERE slug='orbit-watch'), 'ORB-W-41', '41 mm', NULL, '41 mm', 24900000, NULL, (SELECT id FROM s WHERE name='SoundHub Distribution'), 'SH-OW-41', 16000000, 3, 12, 4, 1),
 ((SELECT id FROM p WHERE slug='orbit-watch'), 'ORB-W-45', '45 mm', NULL, '45 mm', 26900000, NULL, (SELECT id FROM s WHERE name='SoundHub Distribution'), 'SH-OW-45', 17000000, 3, 8, 4, 2),
 ((SELECT id FROM p WHERE slug='stride-runner'), 'STR-RUN-41', 'EU 41', NULL, 'EU 41', 12900000, NULL, (SELECT id FROM s WHERE name='Stride & Co. Footwear'), 'ST-R-41', 7000000, 4, 10, 3, 1),
 ((SELECT id FROM p WHERE slug='stride-runner'), 'STR-RUN-42', 'EU 42', NULL, 'EU 42', 12900000, NULL, (SELECT id FROM s WHERE name='Stride & Co. Footwear'), 'ST-R-42', 7000000, 4, 14, 3, 2),
 ((SELECT id FROM p WHERE slug='stride-runner'), 'STR-RUN-43', 'EU 43', NULL, 'EU 43', 12900000, NULL, (SELECT id FROM s WHERE name='Stride & Co. Footwear'), 'ST-R-43', 7000000, 4, 0, 3, 3),
 ((SELECT id FROM p WHERE slug='metro-backpack'), 'MET-BPK-BRN', 'Brown', 'Brown', NULL, 15900000, 18000000, (SELECT id FROM s WHERE name='LeatherWorks Aba'), 'LW-MB-01', 9000000, 5, 9, 3, 1),
 ((SELECT id FROM p WHERE slug='echo-buds'), 'ECH-BUD-BLK', 'Black', 'Black', NULL, 6900000, NULL, (SELECT id FROM s WHERE name='SoundHub Distribution'), 'SH-EB-01', 4000000, 2, 30, 5, 1),
 ((SELECT id FROM p WHERE slug='boom-mini-speaker'), 'BOM-SPK-RED', 'Red', 'Red', NULL, 4500000, 5500000, (SELECT id FROM s WHERE name='SoundHub Distribution'), 'SH-BS-01', 2500000, 2, 20, 5, 1),
 ((SELECT id FROM p WHERE slug='ridge-hiking-boot'), 'RDG-BT-42', 'EU 42', NULL, 'EU 42', 17500000, NULL, (SELECT id FROM s WHERE name='Stride & Co. Footwear'), 'ST-HB-42', 10000000, 4, 6, 2, 1),
 ((SELECT id FROM p WHERE slug='ridge-hiking-boot'), 'RDG-BT-44', 'EU 44', NULL, 'EU 44', 17500000, NULL, (SELECT id FROM s WHERE name='Stride & Co. Footwear'), 'ST-HB-44', 10000000, 4, 4, 2, 2),
 ((SELECT id FROM p WHERE slug='classic-bifold-wallet'), 'CLS-WAL-BRN', 'Brown', 'Brown', NULL, 3500000, NULL, (SELECT id FROM s WHERE name='LeatherWorks Aba'), 'LW-BW-01', 1500000, 5, 40, 5, 1);
