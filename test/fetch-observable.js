"use strict"

const mobx = require("mobx")

const { fetchObservable } = require("../src/fetch-observable")

mobx.configure({ enforceActions: "observed" })

test("fetch observable should be lazy", (done) => {
    let started = false
    const fo = fetchObservable((sink) => {
        started = true

        setTimeout(() => sink(1), 50)
        setTimeout(() => sink(2), 100)
    })

    expect(started).toBe(false)
    expect(fo.started).toBe(false)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()
        values.push(value)
    })

    expect(started).toBe(true)
    expect(fo.started).toBe(true)

    setTimeout(() => {
        expect(fo.current()).toBe(2)
        expect(values).toEqual([undefined, 1, 2])

        done()
    }, 200)
})

test("fetch observable sync", (done) => {
    const fo = fetchObservable((sink) => {
        sink(1)
    })

    const values = []
    const pendingValues = []
    const startedValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        pendingValues.push(fo.pending)
        startedValues.push(fo.started)
    })

    expect(fo.started).toBe(true)

    setTimeout(() => {
        expect(fo.current()).toBe(1)
        expect(values).toEqual([1])
        expect(pendingValues).toEqual([false])
        expect(startedValues).toEqual([true])

        done()
    }, 200)
})

test("fetch observable set", (done) => {
    const fo = fetchObservable((sink) =>
        setTimeout(() => {
            sink(1)
        }, 200)
    )

    const values = []
    const pendingValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        pendingValues.push(fo.pending)
    })

    setTimeout(() => {
        fo.set(2)
    }, 100)

    setTimeout(() => {
        expect(fo.current()).toBe(1)
        expect(values).toEqual([undefined, 2, 1])
        expect(pendingValues).toEqual([true, false, false])

        done()
    }, 300)
})

test("fetch observable pending can be observed", (done) => {
    const fo = fetchObservable((sink) =>
        setTimeout(() => {
            sink(1)
        }, 100)
    )

    const values = []
    const pendingValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        pendingValues.push(fo.pending)
    })

    setTimeout(() => {
        expect(values).toEqual([undefined, 1, 1])
        expect(pendingValues).toEqual([true, true, false])

        done()
    }, 200)
})

test("fetch observable started can be observed", (done) => {
    const fo = fetchObservable((sink) =>
        setTimeout(() => {
            sink(1)
        }, 100)
    )

    const values = []
    const startedValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        startedValues.push(fo.started)
    })

    setTimeout(() => {
        expect(values).toEqual([undefined, 1])
        expect(startedValues).toEqual([true, true])

        done()
    }, 200)
})

test("lazy observable fetch", (done) => {
    let started = 0
    let i = 10

    const fo = fetchObservable((sink) => {
        setTimeout(() => {
            started++
            i++

            sink(i)
        }, 50)
    })

    let values = []
    mobx.autorun(() => values.push(fo.current()))

    setTimeout(() => {
        expect(started).toBe(1)
        expect(fo.current()).toBe(11)
        expect(values).toEqual([undefined, 11])

        fo.fetch()
    }, 100)

    setTimeout(() => {
        expect(started).toBe(2)
        expect(fo.current()).toBe(12)
        expect(values).toEqual([undefined, 11, 12])
        done()
    }, 200)
})

test("fetch observable is unstarted", (done) => {
    const fo = fetchObservable()

    const values = []
    const startValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        startValues.push(fo.started)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(undefined)
        expect(fo.started).toBe(false)
        expect(values).toEqual([undefined])
        expect(startValues).toEqual([false])

        done()
    }, 200)
})

test("unstarted fetch observable should fetch", (done) => {
    const fo = fetchObservable()

    const values = []
    const startValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        startValues.push(fo.started)
    })

    fo.setFetch((sink) => {
        setTimeout(() => sink(1), 50)
    })

    expect(fo.current()).toBe(undefined)

    setTimeout(() => {
        expect(fo.current()).toBe(undefined)

        fo.fetch()
    }, 100)

    setTimeout(() => {
        expect(fo.current()).toBe(1)
        expect(values).toEqual([undefined, 1])
        expect(startValues).toEqual([false, true])

        done()
    }, 200)
})

test("fetch observable pending can be observed on setFetch", (done) => {
    const fo = fetchObservable((sink) =>
        setTimeout(() => {
            sink(1)
        }, 100)
    )

    const values = []
    const pendingValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        pendingValues.push(fo.pending)
    })

    setTimeout(() => {
        fo.setFetch((sink) => {
            setTimeout(() => {
                sink(2)
            }, 100)
        })

        fo.fetch()
    }, 200)

    setTimeout(() => {
        expect(values).toEqual([undefined, 1, 1, 1, 2, 2])
        expect(pendingValues).toEqual([true, true, false, true, true, false])

        done()
    }, 600)
})

test("started fetch observable should fetch", (done) => {
    const fo = fetchObservable((sink) => setTimeout(() => sink(1), 100))

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        fo.setFetch((sink) => {
            sink(2)
        })

        fo.fetch()
    }, 200)

    setTimeout(() => {
        expect(fo.current()).toBe(2)
        expect(values).toEqual([undefined, 1, 2])

        done()
    }, 300)
})

test("fetch observable map before result arrives", (done) => {
    const fo = fetchObservable((sink) => setTimeout(() => sink(1), 100))
    fo.mapFetch((value) => value + 1)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(2)
        expect(values).toEqual([undefined, 2])

        done()
    }, 200)
})

test("fetch observable map after result arrives", (done) => {
    const fo = fetchObservable((sink) => setTimeout(() => sink(1), 100))

    setTimeout(() => {
        fo.mapFetch((value) => value + 1)
    }, 200)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(2)
        expect(values).toEqual([undefined, 1, 2])

        done()
    }, 300)
})

test("fetch observable map before sync result arrives", (done) => {
    const fo = fetchObservable((sink) => sink(1))

    fo.mapFetch((value) => value + 1)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(2)
        expect(values).toEqual([1, 2])

        done()
    }, 300)
})

test("fetch observable map after sync result arrives", (done) => {
    const fo = fetchObservable((sink) => sink(1))

    setTimeout(() => {
        fo.mapFetch((value) => value + 1)
    }, 100)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(2)
        expect(values).toEqual([1, 2])

        done()
    }, 300)
})

test("fetch observable flatmap after result arrives", (done) => {
    const fo = fetchObservable((sink) => setTimeout(() => sink(1), 100))

    setTimeout(() => {
        fo.flatMapFetch((value) =>
            fetchObservable((sink) => setTimeout(() => sink(value + 10), 100))
        )
    }, 200)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(11)
        expect(values).toEqual([undefined, 1, 11])

        done()
    }, 400)
})

test("fetch observable flatmap before result arrives", (done) => {
    const fo = fetchObservable((sink) => setTimeout(() => sink(1), 200))

    fo.flatMapFetch((value) => fetchObservable((sink) => setTimeout(() => sink(value + 10), 100)))

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(11)
        expect(values).toEqual([undefined, 1, 11])

        done()
    }, 400)
})

test("fetch observable flatmap before instant result arrives", (done) => {
    const fo = fetchObservable((sink) => setTimeout(() => sink(1), 100))

    fo.flatMapFetch((value) => fetchObservable((sink) => sink(value + 10)))

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        //expect(fo.current()).toBe(11)
        expect(values).toEqual([undefined, 11])

        done()
    }, 400)
})
