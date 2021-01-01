"use strict"

const mobx = require("mobx")

const { FetchObservable } = require("../src/fetch-observable")

mobx.configure({ enforceActions: "observed" })

test("fetch observable should be lazy", (done) => {
    let started = false
    const fo = new FetchObservable((sink) => {
        started = true

        setTimeout(() => sink(1), 50)
        setTimeout(() => sink(2), 100)
    })

    expect(fo.fulfilled).toBe(false)
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
    const fo = new FetchObservable((sink) => {
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
    const fo = new FetchObservable((sink) =>
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
    const fo = new FetchObservable((sink) =>
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

test("fetch async observable started can be observed", (done) => {
    const fo = new FetchObservable((sink) =>
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

test("fetch observable sync started can be observed", (done) => {
    const fo = new FetchObservable((sink) => {
        sink(1)
    })

    const values = []
    const startedValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        startedValues.push(fo.started)
    })

    setTimeout(() => {
        expect(values).toEqual([1])
        expect(startedValues).toEqual([true])

        done()
    }, 200)
})

test("fetch async observable fulfilled can be observed", (done) => {
    const fo = new FetchObservable((sink) =>
        setTimeout(() => {
            sink(1)
        }, 100)
    )

    const values = []
    const fulfilledValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        fulfilledValues.push(fo.fulfilled)
    })

    setTimeout(() => {
        expect(fulfilledValues).toEqual([false, true])
        expect(values).toEqual([undefined, 1])

        done()
    }, 200)
})

test("fetch sync observable fulfilled can be observed", (done) => {
    const fo = new FetchObservable((sink) => {
        sink(1)
    })

    const values = []
    const fulfilledValues = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
        fulfilledValues.push(fo.fulfilled)
    })

    setTimeout(() => {
        expect(values).toEqual([1])
        expect(fulfilledValues).toEqual([true])

        done()
    }, 200)
})

test("lazy observable fetch", (done) => {
    let started = 0
    let i = 10

    const fo = new FetchObservable((sink) => {
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
    const fo = new FetchObservable()

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
    const fo = new FetchObservable()

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
    const fo = new FetchObservable((sink) =>
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
    const fo = new FetchObservable((sink) => setTimeout(() => sink(1), 100))

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

test("fetch observable async map does not alter original observable", (done) => {
    const fo = new FetchObservable((sink) => setTimeout(() => sink(1), 100))
    const fo2 = fo.mapFetch((value) => value + 1)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(1)
        expect(values).toEqual([undefined, 1])

        done()
    }, 200)
})

test("fetch observable sync map has no side effects", (done) => {
    const fo = new FetchObservable((sink) => sink(1))
    const fo2 = fo.mapFetch((value) => value + 1)

    const values = []

    mobx.autorun(() => {
        const value = fo.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo.current()).toBe(1)
        expect(values).toEqual([1])

        done()
    }, 200)
})

test("fetch observable map before async result arrives", (done) => {
    const fo1 = new FetchObservable((sink) => setTimeout(() => sink(1), 100))
    const fo2 = fo1.mapFetch((value) => value + 1)

    const values = []

    mobx.autorun(() => {
        const value = fo2.current()

        values.push(value)
    })

    setTimeout(() => {
        expect(fo2.current()).toBe(2)
        expect(values).toEqual([undefined, 2])

        done()
    }, 200)
})

test("fetch observable map after sync result arrives", (done) => {
    const fo1 = new FetchObservable((sink) => sink(1))

    expect(fo1.current()).toBe(1)

    setTimeout(() => {
        const fo2 = fo1.mapFetch((value) => value + 1)

        const values = []

        mobx.autorun(() => {
            const value = fo2.current()

            values.push(value)
        })

        setTimeout(() => {
            expect(fo1.current()).toBe(1)
            expect(fo2.current()).toBe(2)
            expect(values).toEqual([undefined, 2])

            done()
        }, 200)
    }, 100)
})

test("mapped fetch observable fetches", (done) => {
    let i = 0
    const fo1 = new FetchObservable((sink) =>
        setTimeout(() => {
            i++
            sink(i)
        }, 100)
    )

    let j = 0
    const fo2 = fo1.mapFetch((value) => {
        j++
        return value + 1
    })

    const values = []

    mobx.autorun(() => {
        const value = fo2.current()

        values.push(value)
    })

    setTimeout(() => {
        fo1.fetch()
    }, 300)

    setTimeout(() => {
        fo2.fetch()
    }, 600)

    setTimeout(() => {
        expect(fo2.current()).toBe(2)
        expect(values).toEqual([undefined, 2])
        expect(i).toBe(1)
        expect(j).toBe(1)
    }, 200)

    setTimeout(() => {
        expect(fo2.current()).toBe(3)
        expect(values).toEqual([undefined, 2, 3])
        expect(i).toBe(2)
        expect(j).toBe(2)
    }, 500)

    setTimeout(() => {
        expect(fo2.current()).toBe(3)
        expect(values).toEqual([undefined, 2, 3])
        expect(i).toBe(2)
        expect(j).toBe(3)

        done()
    }, 700)

})
