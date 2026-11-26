package dev.vaakx.sand

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.util.Base64
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.io.IOException

class Saved(val type: String, val bytes: ByteArray)

fun savedOf(dataUrl: String): Saved {
    val (header, data) = dataUrl.split(',', limit = 2)
    return Saved(header.removePrefix("data:").substringBefore(';'), Base64.decode(data, Base64.DEFAULT))
}

class Saver(private val activity: ComponentActivity) {
    private var pending: ByteArray? = null

    private val create = activity.registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        result.data?.data?.takeIf { result.resultCode == Activity.RESULT_OK }?.let(::write)
        pending = null
    }

    fun save(name: String, dataUrl: String) {
        val saved = savedOf(dataUrl)
        pending = saved.bytes
        create.launch(Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(saved.type).putExtra(Intent.EXTRA_TITLE, name))
    }

    private fun write(uri: Uri) {
        val bytes = pending ?: return
        try {
            activity.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
        } catch (error: IOException) {
            Toast.makeText(activity, R.string.save_failed, Toast.LENGTH_LONG).show()
        }
    }
}
