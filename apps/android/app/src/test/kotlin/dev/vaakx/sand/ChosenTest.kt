package dev.vaakx.sand

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

private val FIRST = Uri.parse("content://media/picker/0/images/101")
private val SECOND = Uri.parse("content://media/picker/0/images/102")

private fun picked(vararg uris: Uri) = Intent().apply {
    clipData = ClipData.newRawUri(null, uris.first()).also { clip -> uris.drop(1).forEach { clip.addItem(ClipData.Item(it)) } }
}

@RunWith(RobolectricTestRunner::class)
class ChosenTest {
    @Test
    fun takesEveryFileThePickerReturnsInClipData() {
        assertArrayEquals(arrayOf(FIRST, SECOND), chosenFiles(Activity.RESULT_OK, picked(FIRST, SECOND)))
    }

    @Test
    fun takesOneFileReturnedOnlyInClipData() {
        assertArrayEquals(arrayOf(FIRST), chosenFiles(Activity.RESULT_OK, picked(FIRST)))
    }

    @Test
    fun takesAFileReturnedAsTheIntentData() {
        assertArrayEquals(arrayOf(FIRST), chosenFiles(Activity.RESULT_OK, Intent().setData(FIRST)))
    }

    @Test
    fun choosesNothingWhenCancelled() {
        assertNull(chosenFiles(Activity.RESULT_CANCELED, picked(FIRST)))
    }
}
