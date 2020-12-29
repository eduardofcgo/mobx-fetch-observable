import { observable, action, reaction, _allowStateChanges, when } from "mobx"

type Fetch<T> = (sink: (newValue: T) => void) => void

function id<T>(value: T): T {
    return value
}

export interface IFetchObservable<T> {
    current(): T | undefined
    fetch(): T | undefined
    set(value: T | undefined): T | undefined
    setFetch(newFetch: Fetch<T>): T | undefined
    mapFetch(fn: (value: T | undefined) => T | undefined): T | undefined
    flatMapFetch(fn: (value: T | undefined) => IFetchObservable<T | undefined>): T | undefined
    pending: boolean
    started: boolean
    fulfilled: boolean
}

export function fetchObservable<T>(fetch: Fetch<T>): IFetchObservable<T | undefined>
export function fetchObservable(): IFetchObservable<undefined>

export function fetchObservable<T>(
    initialFetch: Fetch<T> | undefined = undefined
): IFetchObservable<T> {
    let started = false

    const initialValue = undefined
    const emptyFetch: Fetch<undefined> = (sink) => {
        sink(initialValue)
    }

    let fetch = initialFetch || emptyFetch
    const value = observable.box<T | undefined>(initialValue, { deep: false })
    const pending = observable.box<boolean>(false)

    let mapFns: ((value: T | undefined) => T | undefined)[] = []

    reaction(
        () => value.get(),
        (newValue, oldValue) => {
            const comp = mapFns.reduce((acc, c, i, a) => (v) => c(acc(v)), id)

            value.set(comp(newValue))

            mapFns = []
        }
    )

    const currentFnc = () => {
        if (!started) {
            started = true
            _allowStateChanges(true, () => {
                pending.set(true)
            })

            fetch((newValue: T | undefined) => {
                _allowStateChanges(true, () => {
                    value.set(newValue)
                    pending.set(false)
                })
            })
        }

        return value.get()
    }

    const setFnc = action("lazyObservable-set", (newValue: T | undefined) => {
        value.set(newValue)
        pending.set(false)
        return value.get()
    })

    const setFetchFnc = action("lazyObservable-setFetch", (newFetch: Fetch<T>): T | undefined => {
        fetch = newFetch
        return value.get()
    })

    return {
        current: currentFnc,
        fetch() {
            if (started) started = false
            return currentFnc()
        },
        set(newVal: T | undefined) {
            return setFnc(newVal)
        },
        setFetch(newFetch: Fetch<T>): T | undefined {
            return setFetchFnc(newFetch)
        },
        get pending() {
            return pending.get()
        },
        get started() {
            return started && fetch !== emptyFetch
        },
        get fulfilled() {
            return this.started && !this.pending
        },
        mapFetch(fn: (value: T | undefined) => T | undefined): T | undefined {
            if (this.fulfilled) return this.set(fn(value.get()))
            else {
                mapFns.push(fn)
                return value.get()
            }
        },
        flatMapFetch(fn: (value: T | undefined) => IFetchObservable<T | undefined>): T | undefined {
            return this.mapFetch((value) => {
                const o = fn(value)
                // inner observable is needed as soon as the map function from
                // outer observable is called, which is when the outer is fulfilled
                o.current()

                const innerValue = o.mapFetch((innerValue) => {
                    this.set(innerValue)

                    return innerValue
                })

                return o.fulfilled ? innerValue : value
            })
        },
    }
}
