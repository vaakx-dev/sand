package dev.vaakx.sand

import com.google.crypto.tink.subtle.Ed25519Sign
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketException
import java.util.Base64
import java.util.Collections
import kotlin.concurrent.thread

private const val TOKEN = "garden-token"
private const val PC_ID = "pc-garden"

private fun encoded(bytes: ByteArray) = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

private fun event(id: String, title: String) = "id: $id\ndata: ${JSONObject().put("title", title).put("tag", id).put("thread", "thread-$id")}\n\n"

private class Asked(val target: String, val headers: Map<String, String>)

private fun askedOn(client: Socket): Asked {
    val lines = client.getInputStream().bufferedReader().let { reader -> generateSequence(reader::readLine).takeWhile { it.isNotEmpty() }.toList() }
    val headers = lines.drop(1).associate { line -> line.substringBefore(':').lowercase() to line.substringAfter(':').trim() }
    return Asked(lines.first().split(' ')[1], headers)
}

private class FakePc(private val events: List<String>) {
    private val keys = Ed25519Sign.KeyPair.newKeyPair()
    private val server = ServerSocket(0, 8, InetAddress.getLoopbackAddress())
    val seen: MutableList<String?> = Collections.synchronizedList(mutableListOf())
    val route = "http://127.0.0.1:${server.localPort}"

    init {
        thread(isDaemon = true) { serve() }
    }

    fun stop() = server.close()

    private fun serve() {
        while (true) {
            val client = try {
                server.accept()
            } catch (closed: SocketException) {
                return
            }
            client.use { answerOn(it) }
        }
    }

    private fun answerOn(client: Socket) {
        val asked = askedOn(client)
        val (status, body) = if (asked.target.startsWith("/identity")) identity(asked) else inbox(asked)
        val bytes = body.toByteArray()
        val head = "HTTP/1.1 $status X\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n\r\n"
        client.getOutputStream().apply { write(head.toByteArray()); write(bytes); flush() }
    }

    private fun identity(asked: Asked): Pair<Int, String> {
        val clientNonce = asked.target.substringAfter("nonce=")
        val nonce = "pc-nonce"
        val proof = listOf("sand-identity", clientNonce, nonce, PC_ID).joinToString("\n").toByteArray()
        val reply = JSONObject()
            .put("id", PC_ID)
            .put("nonce", nonce)
            .put("publicKey", encoded(keys.publicKey))
            .put("signature", encoded(Ed25519Sign(keys.privateKey).sign(proof)))
            .put("appProtocol", 2)
        return 200 to reply.toString()
    }

    private fun inbox(asked: Asked): Pair<Int, String> {
        if (asked.headers["authorization"] != "Bearer $TOKEN") return 401 to ""
        seen += asked.headers["last-event-id"]
        return 200 to ":\n\n" + events.joinToString("")
    }
}

@RunWith(RobolectricTestRunner::class)
class InboxTest {
    private val pcs = mutableListOf<FakePc>()

    private fun pairedWith(events: List<String>): Pair<FakePc, Pc> {
        val fake = FakePc(events).also(pcs::add)
        val pc = Pc(RuntimeEnvironment.getApplication()).apply { pair(fake.route) }
        return fake to pc
    }

    @After
    fun stopPcs() = pcs.forEach(FakePc::stop)

    @Test
    fun hearsEachNoticeAndTellsThePcTheLastOneItSawWhenItComesBack() {
        val (fake, pc) = pairedWith(listOf(event("a", "Tidy the garden"), event("b", "Water the roses")))
        val heard = mutableListOf<Heard>()
        var connections = 0

        val ending = Inbox(pc, TOKEN).listen(null, heard::add) { connections++ }
        Inbox(pc, TOKEN).listen(heard.last().id, {}, {})

        assertEquals(Ending.DROPPED, ending)
        assertEquals(1, connections)
        assertEquals(listOf("a" to "Tidy the garden", "b" to "Water the roses"), heard.map { it.id to it.notice.getString("title") })
        assertEquals(listOf(null, "b"), fake.seen)
    }

    @Test
    fun aTokenThePcNoLongerKnowsIsRefused() {
        val (_, pc) = pairedWith(emptyList())

        assertEquals(Ending.REFUSED, Inbox(pc, "old-token").listen(null, {}, {}))
    }

    @Test
    fun aPcThatDoesNotAnswerIsUnreachable() = ServerSocket(0, 1, InetAddress.getLoopbackAddress()).use { silent ->
        val pc = Pc(RuntimeEnvironment.getApplication()).apply { pair("http://127.0.0.1:${silent.localPort}") }

        assertEquals(Ending.UNREACHABLE, Inbox(pc, TOKEN).listen(null, {}, {}))
    }
}
