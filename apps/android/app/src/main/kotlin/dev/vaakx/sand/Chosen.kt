package dev.vaakx.sand

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri

private fun urisOf(clip: ClipData) = List(clip.itemCount) { clip.getItemAt(it).uri }

fun chosenFiles(resultCode: Int, result: Intent?): Array<Uri>? {
    if (resultCode != Activity.RESULT_OK || result == null) return null
    val picked = result.clipData?.let(::urisOf).orEmpty().ifEmpty { listOfNotNull(result.data) }
    return picked.takeIf { it.isNotEmpty() }?.toTypedArray()
}
