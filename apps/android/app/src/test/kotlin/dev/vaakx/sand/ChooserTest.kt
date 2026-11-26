package dev.vaakx.sand

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.webkit.WebChromeClient.FileChooserParams
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

private val FIRST = Uri.parse("content://media/picker/0/images/101")
private val SECOND = Uri.parse("content://media/picker/0/images/102")

private fun picked(vararg uris: Uri) = Intent().apply {
    clipData = ClipData.newRawUri(null, uris.first()).also { clip -> uris.drop(1).forEach { clip.addItem(ClipData.Item(it)) } }
}

private class Asked(private val accept: String, private val capture: Boolean, private val multiple: Boolean) : FileChooserParams() {
    override fun getMode() = if (multiple) FileChooserParams.MODE_OPEN_MULTIPLE else FileChooserParams.MODE_OPEN
    override fun getAcceptTypes() = accept.split(',').toTypedArray()
    override fun isCaptureEnabled() = capture
    override fun getTitle(): CharSequence? = null
    override fun getFilenameHint(): String? = null
    override fun createIntent() = Intent(Intent.ACTION_GET_CONTENT).setType("*/*")
}

@RunWith(RobolectricTestRunner::class)
class ChooserTest {
    @Test
    fun opensTheCameraOnlyWhenThePageAsksToCaptureAnImage() {
        assertEquals(true, wantsPhoto(Asked("image/*", capture = true, multiple = false)))
        assertEquals(false, wantsPhoto(Asked("image/*", capture = false, multiple = false)))
        assertEquals(false, wantsPhoto(Asked("image/*,video/*", capture = true, multiple = false)))
        assertEquals(false, wantsPhoto(Asked("", capture = true, multiple = false)))
    }

    @Test
    fun letsThePickerTakeSeveralFilesOnlyWhenThePageAllowsIt() {
        assertEquals(true, pickerIntent(Asked("", capture = false, multiple = true)).getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, false))
        assertEquals(false, pickerIntent(Asked("", capture = false, multiple = false)).getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, true))
    }

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
