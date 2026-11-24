package dev.vaakx.sand

import android.Manifest
import android.app.Notification
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

private const val NOTICES_CHANNEL = "threads"
private const val CONNECTION_CHANNEL = "connection"
private const val PREFS = "notices"
private const val TOKEN = "token"
private const val SEEN = "seen"
const val EXTRA_PATH = "path"
const val CONNECTION_NOTICE = 1

private fun addressOf(notice: JSONObject): String {
    val thread = notice.optString("thread")
    if (thread.isNotEmpty()) return "/?view=thread&id=${Uri.encode(thread)}"
    val bot = notice.optString("bot")
    return if (bot.isNotEmpty()) "/?view=bot&id=${Uri.encode(bot)}" else "/"
}

private fun opening(context: Context, path: String, code: Int): PendingIntent {
    val open = Intent(context, MainActivity::class.java).putExtra(EXTRA_PATH, path)
    return PendingIntent.getActivity(context, code, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
}

private fun ensureChannels(context: Context) {
    val notices = NotificationChannel(NOTICES_CHANNEL, context.getString(R.string.notices), NotificationManager.IMPORTANCE_HIGH)
    val connection = NotificationChannel(CONNECTION_CHANNEL, context.getString(R.string.connection), NotificationManager.IMPORTANCE_MIN).apply {
        setShowBadge(false)
        setSound(null, null)
    }
    context.getSystemService(NotificationManager::class.java).createNotificationChannels(listOf(notices, connection))
}

private fun post(context: Context, tag: String?, id: Int, notification: Notification) {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    NotificationManagerCompat.from(context).notify(tag, id, notification)
}

fun noticesShown(context: Context) = NotificationManagerCompat.from(context).areNotificationsEnabled()

fun show(context: Context, notice: JSONObject) {
    ensureChannels(context)
    val tag = notice.optString("tag")
    val body = notice.optString("body")
    val notification = NotificationCompat.Builder(context, NOTICES_CHANNEL)
        .setSmallIcon(R.drawable.notice)
        .setContentTitle(notice.optString("title", "sand"))
        .setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        .setAutoCancel(true)
        .setContentIntent(opening(context, addressOf(notice), tag.hashCode()))
        .build()
    post(context, tag, 0, notification)
}

fun connectionNotice(context: Context, state: Int): Notification {
    ensureChannels(context)
    return NotificationCompat.Builder(context, CONNECTION_CHANNEL)
        .setSmallIcon(R.drawable.notice)
        .setContentTitle(context.getString(state))
        .setOngoing(true)
        .setSilent(true)
        .setShowWhen(false)
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .setContentIntent(opening(context, "/", CONNECTION_NOTICE))
        .build()
}

fun showConnection(context: Context, state: Int) = post(context, null, CONNECTION_NOTICE, connectionNotice(context, state))

object Notices {
    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun token(context: Context) = prefs(context).getString(TOKEN, null)

    fun seen(context: Context) = prefs(context).getString(SEEN, null)

    fun saw(context: Context, id: String) = prefs(context).edit { putString(SEEN, id) }

    fun start(context: Context, token: String) {
        prefs(context).edit { putString(TOKEN, token).remove(SEEN) }
        resume(context)
    }

    fun resume(context: Context) {
        if (token(context) != null) ContextCompat.startForegroundService(context, Intent(context, Listener::class.java))
    }

    fun stop(context: Context) {
        prefs(context).edit { clear() }
        context.stopService(Intent(context, Listener::class.java))
    }

    fun refused(context: Context, token: String) {
        if (token(context) == token) prefs(context).edit { clear() }
    }
}
