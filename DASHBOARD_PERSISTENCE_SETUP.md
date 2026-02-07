# Dashboard Persistence Setup Guide

This guide will help you set up data persistence for the Blackout dashboard so that XRPL rewards and smart device states persist across sessions.

## What's Been Changed

### 1. Database Schema
- **New columns** added to `consumer_profiles` table to store XRPL wallet data and savings
- **New table** `profile_payouts` to track payout history

### 2. New Files Created
- `src/lib/dashboardPersistence.ts` - Helper functions for persisting dashboard data
- `src/app/api/xrpl/profile/route.ts` - API endpoint for loading/saving profile XRPL data
- `dashboard_persistence.sql` - SQL schema to run in Supabase

### 3. Modified Components
- `XRPLWalletPanel.tsx` - Now loads and saves data from consumer_profiles table
- `dashboard/page.tsx` - Passes profileId to XRPL panel

### 4. Modified API Routes
- `/api/xrpl/setup/route.ts` - Updated to support seed-based trust line creation
- `/api/xrpl/status/route.ts` - Updated to support address-based balance queries
- `/api/xrpl/payout/route.ts` - Updated to support direct payouts with address

## Setup Instructions

### Step 1: Run SQL Schema in Supabase

1. Go to your Supabase dashboard: https://uxmhbpmgccjhfsllocox.supabase.co
2. Navigate to the SQL Editor
3. Copy the contents of `dashboard_persistence.sql`
4. Paste and run the SQL to create the new columns and tables

### Step 2: Test the Persistence

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the dashboard for a profile (e.g., Martinez):
   ```
   http://localhost:3000/dashboard?id=e2bfe115-5417-4d25-bac6-d5e299d8c6f5
   ```

3. Set up XRPL wallet:
   - Click "Create Testnet Wallet"
   - Link to profile
   - Create trust line

4. The wallet data should now be saved to the `consumer_profiles` table

5. **Test persistence**: Close the browser, reopen the dashboard, and verify the XRPL wallet is still there!

## How It Works

### XRPL Rewards Persistence

1. **Wallet Creation**: When you create a wallet, it's saved to `consumer_profiles.xrpl_address` and `xrpl_seed`
2. **Trust Line**: When created, `xrpl_trustline_created` is set to true
3. **Savings**: `savings_usd_pending` and `savings_usd_paid` track your rewards
4. **Payouts**: Recorded in the `profile_payouts` table

### Smart Devices Persistence

Smart devices are already persisted in the `consumer_profiles.smart_devices` JSON column. The Enode device states are fetched in real-time from the Enode API.

## Adding Savings to Profiles

To add savings when alerts are accepted, you'll need to update the alert acceptance handler in the dashboard to call:

```typescript
await fetch("/api/xrpl/profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "updateSavings",
    profileId: "your-profile-id",
    pendingDelta: 1.25, // Amount to add
  }),
});
```

## Checking the Data

You can view your persisted data in Supabase:

1. Go to Table Editor in Supabase
2. Select `consumer_profiles` table
3. Look for the XRPL-related columns:
   - `xrpl_address`
   - `xrpl_seed`
   - `xrpl_trustline_created`
   - `savings_usd_pending`
   - `savings_usd_paid`

4. Select `profile_payouts` table to see payout history

## Troubleshooting

### Wallet not persisting?
- Check that the SQL schema was run successfully
- Verify the profileId is correct
- Check browser console for errors

### Balance shows 0?
- Make sure trust line is created
- Check that the XRPL testnet is accessible
- Verify wallet address in Supabase matches the one in the dashboard

### Payouts not saving?
- Check that `profile_payouts` table exists
- Verify the foreign key constraint is set up correctly
- Check API logs for errors

## Next Steps

Once persistence is working, you can:

1. **Add auto-save** when accepting alerts to automatically update savings
2. **Add notifications** when payouts are ready
3. **Create a rewards history** page showing all past payouts
4. **Add leaderboards** comparing savings across profiles

## Questions?

If you run into issues, check:
- Supabase dashboard logs
- Browser console for errors
- Network tab for failed API calls
