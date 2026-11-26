package dev.vaakx.sand

import android.Manifest
import android.app.Application
import android.app.NotificationManager
import android.app.PendingIntent
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class NoticesTest {
    private val context: Application = RuntimeEnvironment.getApplication()

    private fun shown() = shadowOf(context.getSystemService(NotificationManager::class.java)).allNotifications

    private fun opens(intent: PendingIntent) = shadowOf(intent).savedIntent.getStringExtra(EXTRA_PATH)

    @Before
    fun allowNotifications() = shadowOf(context).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)

    @Test
    fun tappingANoticeOpensItsThreadOrBot() {
        show(context, JSONObject().put("title", "Garden plan").put("body", "Finished: beds dug").put("tag", "t1").put("thread", "thread 7"))
        show(context, JSONObject().put("title", "Gardener").put("body", "Needs you: pick seeds").put("tag", "t2").put("bot", "bot 3"))
        show(context, JSONObject().put("title", "sand").put("body", "Paused").put("tag", "t3"))

        val notices = shown().associateBy { it.extras.getString(NotificationCompat.EXTRA_TITLE) }
        assertEquals("/?view=thread&id=thread%207", opens(notices.getValue("Garden plan").contentIntent))
        assertEquals("/?view=bot&id=bot%203", opens(notices.getValue("Gardener").contentIntent))
        assertEquals("/", opens(notices.getValue("sand").contentIntent))
        assertEquals("Needs you: pick seeds", notices.getValue("Gardener").extras.getString(NotificationCompat.EXTRA_TEXT))
    }

    @Test
    fun replyingOpensTheThreadOrBotReadyToTypeWithoutChangingWhereATapGoes() {
        show(context, JSONObject().put("title", "Garden plan").put("body", "Finished: beds dug").put("tag", "t1").put("thread", "thread 7"))
        show(context, JSONObject().put("title", "Gardener").put("body", "Needs you: pick seeds").put("tag", "t2").put("bot", "bot 3"))
        show(context, JSONObject().put("title", "sand").put("body", "Paused").put("tag", "t3"))

        val notices = shown().associateBy { it.extras.getString(NotificationCompat.EXTRA_TITLE) }
        assertEquals("/?view=thread&id=thread%207&reply", opens(notices.getValue("Garden plan").actions.single().actionIntent))
        assertEquals("/?view=bot&id=bot%203&reply", opens(notices.getValue("Gardener").actions.single().actionIntent))
        assertEquals("/?view=thread&id=thread%207", opens(notices.getValue("Garden plan").contentIntent))
        assertNull(notices.getValue("sand").actions)
    }
}
