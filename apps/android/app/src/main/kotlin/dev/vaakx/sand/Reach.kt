package dev.vaakx.sand

import java.net.URI
import java.util.concurrent.Callable
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private const val PREFERENCE_GRACE_MS = 400L
private val PRIVATE_IPV4 = Regex("""^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)""")

private fun onLan(route: String) = URI(route).host?.let(PRIVATE_IPV4::containsMatchIn) == true

private fun daemonPool(): ExecutorService = Executors.newCachedThreadPool { task -> Thread(task).apply { isDaemon = true } }

class Found<T>(val route: String, val proof: T)

private class Race<T : Any>(private val routes: List<String>) {
    private val finished = BooleanArray(routes.size)
    private var leader: IndexedValue<T>? = null
    private var deadlineNs = Long.MAX_VALUE

    fun hear(answer: IndexedValue<T?>) {
        finished[answer.index] = true
        val proof = answer.value ?: return
        if (leader == null) deadlineNs = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(PREFERENCE_GRACE_MS)
        if (leader.let { it == null || answer.index < it.index }) leader = IndexedValue(answer.index, proof)
    }

    fun decided() = leader?.let { (0 until it.index).all(finished::get) } ?: finished.all { it }

    fun waitNs() = deadlineNs - System.nanoTime()

    fun winner() = leader?.let { Found(routes[it.index], it.value) }
}

class Reach<T : Any>(private val prove: (String) -> T?) {
    private val pool = daemonPool()
    @Volatile private var found: Found<T>? = null
    private var search: CompletableFuture<Found<T>?>? = null

    fun current() = found

    fun found(routes: List<String>): Found<T>? = found ?: searching(routes).join()

    @Synchronized
    fun forget() {
        found = null
        search = null
    }

    @Synchronized
    private fun searching(routes: List<String>) = search ?: start(routes)

    private fun start(routes: List<String>): CompletableFuture<Found<T>?> {
        val started = CompletableFuture.supplyAsync({ race(routes.sortedByDescending(::onLan)) }, pool)
        search = started
        started.thenAccept { winner -> settle(started, winner) }
        return started
    }

    @Synchronized
    private fun settle(settled: CompletableFuture<Found<T>?>, winner: Found<T>?) {
        if (search !== settled) return
        search = null
        found = winner
    }

    private fun race(routes: List<String>): Found<T>? {
        val answers = ExecutorCompletionService<IndexedValue<T?>>(pool)
        val probes = routes.mapIndexed { index, route -> answers.submit(Callable { IndexedValue(index, prove(route)) }) }
        val race = Race<T>(routes)
        while (!race.decided()) {
            val answer = answers.poll(race.waitNs(), TimeUnit.NANOSECONDS) ?: break
            race.hear(answer.get())
        }
        probes.forEach { it.cancel(true) }
        return race.winner()
    }
}
