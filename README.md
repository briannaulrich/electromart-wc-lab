# ElectroMart CCC App

**FIN 4150 · Chapter 14: Working Capital Policy**

You will use Claude Code to build a web app that reads ElectroMart's financial statements, calculates the cash conversion cycle (CCC) and has levers that show what happens when inventory, collection or payment days change. You then publish it with GitHub Pages, so it installs on your phone or laptop like any other app. A web app that installs this way is called a progressive web app (PWA).

Fill in section 1 of the case worksheet by hand before you start. You will check the app against it.

## What's in this repository

| File | What it is |
|---|---|
| `case/ElectroMart_Case.md` | The case |
| `data/electromart.csv` | ElectroMart's statements, before and after the changes. The `section` column marks income statement, asset, and liability or equity lines. |
| `data/assumptions.csv` | Days in the year, the bank's interest rate and the supplier's credit terms |
| `data/canyon_audio_supply.csv` | A second company in the same format, for testing |
| `icons/` | The app's icons |
| `CLAUDE.md` | Instructions Claude reads at the start of every session. Read it so you know how Claude has been told to work with you. |

## Part A: By hand first (no AI)

Fill in section 1 of the case worksheet: DIO, DSO, DPO and the CCC, Before and After. A calculator is fine. Keep the worksheet next to you, because Claude will ask for your numbers.

## Part B: Build the calculator (20 minutes)

Start a Claude Code session on your repository and paste this prompt:

> Read CLAUDE.md, README.md and case/ElectroMart_Case.md. Build the first version of the app: a page that reads data/electromart.csv and data/assumptions.csv and shows DIO, DSO, DPO and the cash conversion cycle for Before and After, plus the cash freed by inventory, by receivables and by payables. Walk me through it.

Then:

- When Claude asks for your Part A numbers, give them. If yours don't match Claude's, figure out who is right and why. Rounding counts.
- Check one number yourself with a calculator: the cash freed by cutting inventory, worked out from the days, (73.00 − 36.50) × 6,000,000 / 365. It should match the drop in the inventory balance.

## Part C: Add the levers (20 minutes)

Write your own prompt asking Claude to add three sliders: DIO, DSO and DPO. When you move a slider, the app should show:

1. The new cash conversion cycle
2. The inventory, receivables and payables balances those days imply
3. The cash freed compared with Before
4. The interest saved each year if that cash pays down the bank line
5. How many days past the net-30 due date ElectroMart pays, and the annual cost of skipping the 2% discount

Also ask for **Set to Before** and **Set to After** buttons. You can't open the app until Part D publishes it, so ask Claude to show you in chat what Set to After gives. The CCC should match your worksheet. You'll click the buttons yourself after Part D.

## Part D: Make it installable and publish it (15 minutes)

1. Paste this prompt: "Make this a progressive web app. Add a web app manifest that uses the icons in icons/ and a service worker so it installs and works offline. Then commit and push."
2. In the **Changes** card beside the chat, click the line counts (like `+120 -0`) to see every change Claude made. Read through it.
3. Click **Create PR**. On GitHub, open your repository's **Pull requests** tab and open the new pull request. Click **Merge pull request**, then **Confirm merge**.
4. On GitHub, go to your repository's **Settings**, then **Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose **main** and **/ (root)**, and click **Save**.
5. Wait a few minutes and refresh the Pages screen. Your app's address appears at the top. It looks like `https://your-username.github.io/electromart-wc-lab/`.

   If the address doesn't appear, open your repository's **Actions** tab and look for a run called **pages build and deployment**. If there's no such run after a few minutes, go back to **Settings**, then **Pages**. Set the branch to **None** and click **Save**. Then choose **main** and **/ (root)** again and click **Save**. When the run in the **Actions** tab has a green check, refresh the Pages screen.
6. Open the address and install the app. In Chrome or Edge, click the install icon in the address bar. On an iPhone, tap Share, then **Add to Home Screen**.

## Part E: Use the levers (10 minutes)

Use your app to answer the memo questions in the Canvas assignment. Every answer should cite a number from the app or your worksheet.

## Part F (optional): Any company

Ask Claude to add a button that loads another company's CSV from your device. The file must be read in the browser and never uploaded. Test it with `data/canyon_audio_supply.csv`.

Canyon Audio Supply has one year of statements, so its Before and After columns are the same and the cash freed starts at $0. Move the levers to see changes. The app still uses ElectroMart's bank rate and supplier terms from `assumptions.csv`.

Part D already merged your first pull request. To get this change onto your live app, click **Create PR** again and merge the new pull request.

## Submit

In the Canvas assignment, paste your app's address, your repository's address and your memo.
