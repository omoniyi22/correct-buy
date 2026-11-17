# CorrectBuy Marketplace

Open zip and start this project

use this logo
use this paystack secret key 
@secret:STRIPE_TEST_API_KEY  


use this public key pk_test_8b729019945b20bbd4d5475a9b72655c7b9e83fc

paste them in the .env

this is the @connector:resend:"Resend" email key
paste it in the .env

email info@correctbuy.ng

@secret:RESEND_API_KEY 




Don't stop until you are done
These are the 10 things you need to fix or set up before you can safely take real orders:

Turn on payments. Add the live Paystack keys, point the webhook at your live domain, and place one real test order from start to finish.

Send emails. Connect an email service so customers get order confirmation and shipping emails, suppliers receive their orders, and you get new-order alerts.

Release stuck stock. Schedule the existing cleanup job (expire_stale_orders) to run every 5–10 minutes. Without it, products will slowly show as "out of stock" when they aren't.

Catch late payments. Add a simple admin list of orders marked "refund needed." Otherwise a customer can be charged and get nothing.

Decide how refunds work. Either connect Paystack refunds, or write a short process for staff to refund manually in the Paystack dashboard.

Load real data. Replace the demo products, prices, stock, suppliers, coupons and delivery fees with real ones.

Write real policies. Fill in the Terms, Privacy, Shipping and Returns pages. (all this can be updated in the admin html editor)

Set up your domain. Connect the domain, update the Google sign-in and email confirmation links, and fix robots.txt.

Set up admin access. Create your real admin account and remove any test accounts.

Do a final check. Confirm the homepage hero saves correctly, then go through the main shopping path (home, product, cart, checkout, order confirmation) on phone and desktop.

Everything else from the earlier lists can wait until after launch.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97ed9b49-0a67-44b3-82a2-6f46a26d099b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
