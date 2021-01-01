import { observable, action, reaction, _allowStateChanges, IObservableValue, runInAction } from "mobx"

type Fetch<T> = (sink: (newValue: T) => void) => void

export interface IFetchObservable<T> {
    pending: boolean
    started: boolean
    fulfilled: boolean
    current(): T | undefined
    fetch(): T | undefined
    set(value: T): T | undefined
    setFetch(newFetch: Fetch<T>): T | undefined
    forEach(run: ((newValue: T) => void)): void
    map<B>(fn: ((value: T) => B)): IFetchObservable<B>
    flatMap<B>(fn: ((value: T) => IFetchObservable<B>)): IFetchObservable<B>
    then<B>(fn: ((value: T) => (B | IFetchObservable<B>))): IFetchObservable<B>
}

export class FetchObservable<T> implements IFetchObservable<T> {
    private _started: boolean
    private _fetch: Fetch<T> | undefined
    private _pending: IObservableValue<boolean>

    value: IObservableValue<T | undefined>

    constructor(initialFetch: Fetch<T> | undefined = undefined) {
        this._started = false

        this._fetch = initialFetch
        this.value = observable.box<T | undefined>(undefined, { deep: false })
        this._pending = observable.box<boolean>(false)
    }

    current(): T | undefined {
        if (this._fetch !== undefined && !this._started) {
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

    fetch(): T | undefined {
        if (this._started) this._started = false
        return this.current()
    }

    set(newValue: T | undefined): T | undefined {
        runInAction(() => {
            this.value.set(newValue)
            this._pending.set(false)

        })
        return this.value.get()
    }

    setFetch(newFetch: Fetch<T>): T | undefined {
        this._fetch = newFetch
        return this.value.get()
    }

    get pending(): boolean {
        return this._pending.get()
    }

    get started(): boolean {
        return this._started && this._fetch !== undefined
    }

    get fulfilled(): boolean {
        return this.value.get() !== undefined
    }

    forEach(run: ((newValue: T) => void)): void {
        reaction(
            () => this.current(),
            (newValue) => {
                if (newValue !== undefined) run(newValue)
            },
            { fireImmediately: true, name: "fetchObservable-forEach" }
        )
    }

    map<B>(fn: (value: T) => B): IFetchObservable<B> {
        return new FetchObservable<B>(sink => {
            this.forEach(newValue => {
                sink(fn(newValue))
            })
        })
    }

    flatMap<B>(fn: ((value: T) => IFetchObservable<B>)): IFetchObservable<B> {
        return new FetchObservable<B>(sink => {
            this.forEach(newValue => {
                fn(newValue).forEach(sink)
            })
        })
    }

    then<B>(fn: ((value: T) => (B | IFetchObservable<B>))): IFetchObservable<B> {
        return new FetchObservable<B>(sink => {
            this.forEach(newValue => {
                const maybeObs: B | IFetchObservable<B> = fn(newValue)

                if (maybeObs instanceof FetchObservable)
                    maybeObs.forEach(sink)
                else
                    // @ts-ignore
                    sink(maybeObs)
            })
        })
    }
}
