package dev.vaakx.sand

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.io.File

private const val PHOTO_FOLDER = "camera"

private fun urisOf(clip: ClipData) = List(clip.itemCount) { clip.getItemAt(it).uri }

fun chosenFiles(resultCode: Int, result: Intent?): Array<Uri>? {
    if (resultCode != Activity.RESULT_OK || result == null) return null
    val picked = result.clipData?.let(::urisOf).orEmpty().ifEmpty { listOfNotNull(result.data) }
    return picked.takeIf { it.isNotEmpty() }?.toTypedArray()
}

fun wantsPhoto(params: FileChooserParams) = params.isCaptureEnabled && params.acceptTypes.all { it.startsWith("image/") }

fun pickerIntent(params: FileChooserParams): Intent =
    params.createIntent().putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == FileChooserParams.MODE_OPEN_MULTIPLE)

class Chooser(private val activity: ComponentActivity) {
    private val photos by lazy { File(activity.cacheDir, PHOTO_FOLDER).apply { deleteRecursively() } }
    private var waiting: ValueCallback<Array<Uri>>? = null
    private var photo: Uri? = null

    private val pick = activity.registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        answer(chosenFiles(result.resultCode, result.data))
    }

    private val shoot = activity.registerForActivityResult(ActivityResultContracts.TakePicture()) { taken ->
        answer(photo.takeIf { taken }?.let { arrayOf(it) })
    }

    fun show(callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
        waiting?.onReceiveValue(null)
        waiting = callback
        if (wantsPhoto(params)) takePhoto(params) else pick.launch(pickerIntent(params))
        return true
    }

    private fun takePhoto(params: FileChooserParams) {
        val target = newPhoto().also { photo = it }
        try {
            shoot.launch(target)
        } catch (error: ActivityNotFoundException) {
            pick.launch(pickerIntent(params))
        }
    }

    private fun newPhoto(): Uri {
        photos.mkdirs()
        return sharedUri(activity, File.createTempFile("photo", ".jpg", photos))
    }

    private fun answer(files: Array<Uri>?) {
        waiting?.onReceiveValue(files)
        waiting = null
    }
}
