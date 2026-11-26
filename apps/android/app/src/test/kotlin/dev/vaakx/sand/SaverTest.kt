package dev.vaakx.sand

import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SaverTest {
    @Test
    fun readsTheTypeAndBytesTheFileCameWith() {
        val saved = savedOf("data:text/calendar;base64,QkVHSU46VkNBTEVOREFS")
        assertEquals("text/calendar", saved.type)
        assertEquals("BEGIN:VCALENDAR", saved.bytes.decodeToString())
    }
}
