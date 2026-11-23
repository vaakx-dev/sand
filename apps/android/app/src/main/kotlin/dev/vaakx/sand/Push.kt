package dev.vaakx.sand

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import org.json.JSONObject
import org.unifiedpush.android.connector.FailedReason
import org.unifiedpush.android.connector.PushService
import org.unifiedpush.android.connector.UnifiedPush
import org.unifiedpush.android.connector.data.PushEndpoint
import org.unifiedpush.android.connector.data.PushMessage

private const val CHANNEL = "threads"
private const val VAPID = "vapid"
const val EXTRA_PATH = "path"

private fun addressOf(notice: JSONObject): String {
    val thread = notice.optString("thread")
    if (thread.isNotEmpty()) return "/?view=thread&id=${Uri.encode(thread)}"
    val bot = notice.optString("bot")
    return if (bot.isNotEmpty()) "/?bot=${Uri.encode(bot)}" else "/"
}

private fun allowed(context: Context) =
    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

private fun ensureChannel(context: Context) {
    val channel = NotificationChannel(CHANNEL, context.getString(R.string.notices), NotificationManager.IMPORTANCE_HIGH)
    context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
}

private fun show(context: Context, notice: JSONObject) {
    if (!allowed(context)) return
    ensureChannel(context)
    val tag = notice.optString("tag")
    val open = Intent(context, MainActivity::class.java).putExtra(EXTRA_PATH, addressOf(notice))
    val tap = PendingIntent.getActivity(context, tag.hashCode(), open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val body = notice.optString("body")
    val notification = NotificationCompat.Builder(context, CHANNEL)
        .setSmallIcon(R.drawable.notice)
        .setContentTitle(notice.optString("title", "sand"))
        .setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        .setAutoCancel(true)
        .setContentIntent(tap)
        .build()
    NotificationManagerCompat.from(context).notify(tag, 0, notification)
}

private fun vapids(context: Context) = context.getSharedPreferences("push", Context.MODE_PRIVATE)

object Subscription {
    fun start(context: Context, vapid: String) {
        vapids(context).edit { putString(VAPID, vapid) }
        UnifiedPush.tryUseCurrentOrDefaultDistributor(context) { picked ->
            if (picked) UnifiedPush.register(context, vapid = vapid)
            else Page.pushFailed(context.getString(R.string.pick_push_app))
        }
    }

    fun renew(context: Context) {
        val vapid = vapids(context).getString(VAPID, null) ?: return
        if (UnifiedPush.getAckDistributor(context) != null) UnifiedPush.register(context, vapid = vapid)
    }

    fun stop(context: Context) {
        vapids(context).edit { remove(VAPID) }
        UnifiedPush.unregister(context)
    }

    fun available(context: Context) = UnifiedPush.getDistributors(context).isNotEmpty()
}

class Push : PushService() {
    override fun onNewEndpoint(endpoint: PushEndpoint, instance: String) {
        val keys = endpoint.pubKeySet ?: return Page.pushFailed(getString(R.string.push_app_unencrypted))
        Page.pushTarget(endpoint.url, keys.pubKey, keys.auth)
    }

    override fun onMessage(message: PushMessage, instance: String) {
        if (!message.decrypted || Page.visible) return
        show(this, JSONObject(String(message.content)))
    }

    override fun onRegistrationFailed(reason: FailedReason, instance: String) =
        Page.pushFailed(getString(R.string.push_registration_failed, reason.name))

    override fun onUnregistered(instance: String) {}
}
