# Beta 7.3 – Program Incentive Editor Sync Fix

- Fixed a race condition where a background Supabase program sync cleared the incentive editor after a program was opened for editing.
- The rates and residual fields remained visible, making it appear that incentives were missing even though Program History correctly showed the incentive count.
- Background sync now refreshes the currently edited program's incentives instead of blanking the editor.
- No July PDF re-import is required.
