package dev.vaakx.sand

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

private val RESUMING = setOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED)

class Boot : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action in RESUMING) Notices.resume(context)
    }
}
