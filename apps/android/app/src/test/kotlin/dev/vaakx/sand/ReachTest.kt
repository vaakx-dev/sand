package dev.vaakx.sand

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private const val HOME_WIFI = "http://192.168.1.20:4317"
private const val TAILNET = "https://garden-pc.example.ts.net"
private const val TAILNET_DIRECT = "http://100.101.102.103:4317"
private const val SLOWEST_SERIAL_PROBE_MS = 2_500L

class ReachTest {
    private val hung = CountDownLatch(1)

    private fun hang(): Nothing? {
        hung.await()
        return null
    }

    @After
    fun release() = hung.countDown()

    @Test
    fun aRouteThatHangsDoesNotHoldUpOneThatAnswers() {
        val reach = Reach { route -> if (route == TAILNET) hang() else route }
        val startedMs = System.currentTimeMillis()

        val found = reach.found(listOf(TAILNET, TAILNET_DIRECT))

        assertEquals(TAILNET_DIRECT, found?.route)
        assertTrue(System.currentTimeMillis() - startedMs < SLOWEST_SERIAL_PROBE_MS)
    }

    @Test
    fun prefersHomeWifiThenTheSavedOrderWhenSeveralAnswer() {
        val reach = Reach { route -> if (route == TAILNET) route.also { Thread.sleep(100) } else route }

        assertEquals(HOME_WIFI, reach.found(listOf(TAILNET, TAILNET_DIRECT, HOME_WIFI))?.route)
        reach.forget()
        assertEquals(TAILNET, reach.found(listOf(TAILNET, TAILNET_DIRECT))?.route)
    }

    @Test
    fun requestsWaitingTogetherShareOneProbeOfEachRoute() {
        val probed = Collections.synchronizedList(mutableListOf<String>())
        val answer = CountDownLatch(1)
        val reach = Reach { route -> route.also { probed += it; answer.await() } }
        val callers = Executors.newFixedThreadPool(4)

        val waiting = List(4) { callers.submit<String?> { reach.found(listOf(HOME_WIFI, TAILNET))?.route } }
        Thread.sleep(200)
        answer.countDown()

        assertEquals(List(4) { HOME_WIFI }, waiting.map { it.get(5, TimeUnit.SECONDS) })
        assertEquals(listOf(HOME_WIFI, TAILNET), probed.sorted())
        callers.shutdown()
    }
}
