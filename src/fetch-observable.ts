import { observable, action, reaction, _allowStateChanges, IObservableValue } from "mobx"

type Fetch<T> = (sink: (newValue: T) => void) => void
type MapFun<A, B> = (value: A) => B // TODO: use Function1

export interface IFetchObservable<T> {
    current(): T | undefined
    fetch(): T | undefined
    set(value: T | undefined): T | undefined
    setFetch(newFetch: Fetch<T>): T | undefined
    mapFetch<B>(fn: MapFun<T, B>): IFetchObservable<B>
    //flatMapFetch<B>(fn: MapFun<T, IFetchObservable<B>>): IFetchObservable<B>
    pending: boolean
    started: boolean
    fulfilled: boolean
}

const initialValue = undefined
const emptyFetch: Fetch<undefined> = (sink) => {
    sink(initialValue)
}

export class FetchObservable<T> implements IFetchObservable<T> {
    private _started: boolean
    private _fetch: Fetch<T> | Fetch<undefined>
    private _pending: IObservableValue<boolean>

    value: IObservableValue<T | undefined>

    constructor(initialFetch: Fetch<T> | undefined = undefined) {
        this._started = false

        this._fetch = initialFetch || emptyFetch
        this.value = observable.box<T | undefined>(initialValue, { deep: false })
        this._pending = observable.box<boolean>(false)
    }

    setFnc = action("fetchObservable-set", (newValue: T | undefined) => {
        this.value.set(newValue)
        this._pending.set(false)
        return this.value.get()
    })

    setFetchFnc = action("fetchObservable-setFetch", (newFetch: Fetch<T>): T | undefined => {
        this._fetch = newFetch
        return this.value.get()
    })

    current() {
        // TODO: check if if initital fetch, if so, simply return this.value.get()
        // this simpliied the types for the fetch, it does not need the | undefined as the inner type
        // with this, it would be much easier to implement the fulfulled and we could have undefined fullfilled states
        if (!this._started) {
            this._started = true
            _allowStateChanges(true, () => {
                this._pending.set(true)
            })

            this._fetch((newValue: T | undefined) => {
                _allowStateChanges(true, () => {
                    this.value.set(newValue)
                    this._pending.set(false)
                })
            })
        }

        return this.value.get()
    }

    fetch() {
        if (this._started) this._started = false
        return this.current()
    }

    set(newVal: T | undefined) {
        return this.setFnc(newVal)
    }

    setFetch(newFetch: Fetch<T>): T | undefined {
        return this.setFetchFnc(newFetch)
    }

    get pending() {
        return this._pending.get()
    }

    get started() {
        // TODO: how does this work if started is not being watched
        return this._started && this._fetch !== emptyFetch
    }

    get fulfilled() {
        return this.value.get() !== undefined
    }

    mapFetch<B>(fn: (value: T) => B): FetchObservable<B> {
        return new FetchObservable<B>((sink) => {
            reaction(
                () => this.current(),
                (newValue) => {
                    if (newValue !== undefined) sink(fn(newValue))
                },
                { fireImmediately: true, name: "fetchObservable-updateMapped" }
            )
        })
    }
}
