import { observable, action, _allowStateChanges } from "mobx"

type Fetch<T> = (sink: (newValue: T) => void) => void

export interface IFetchObservable<T> {
    current(): T | undefined
    fetch(): T | undefined
    set(value: T): T | undefined
    setFetch(newFetch: Fetch<T>): T | undefined
    pending: boolean
    started: boolean
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

    const setFnc = action("lazyObservable-set", (newValue: T) => {
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
        set(newVal: T) {
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
    }
}
