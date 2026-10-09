import type { Cleanup, ReactiveValue } from "./core";
import type { EventProps } from "./events";

export type MaybeReactive<T> = T | ReactiveValue<T>;

export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ReactiveValue<unknown>
  | Child[];

type ClassToggle =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReactiveValue<unknown>;

export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReactiveValue<unknown>
  | ClassValue[]
  | Record<string, ClassToggle>;

export type StylePrimitive = string | number | boolean | null | undefined;
export type StyleEntry = StylePrimitive | ReactiveValue<StylePrimitive>;
export type StyleMap = Record<string, StyleEntry>;
export type StyleShape = string | StyleMap | null | undefined;
export type StyleValue = StyleShape | ReactiveValue<StyleShape>;

export type WritableSignal<T> = {
  get(): T;
  set(value: T): void;
};

export type AttributePrimitive = string | number | boolean | null | undefined;

type DataProps = {
  [key: `data-${string}`]: MaybeReactive<AttributePrimitive>;
};

type AriaProps = {
  [key: `aria-${string}`]: MaybeReactive<AttributePrimitive>;
};

export type CommonProps<E extends Element> = {
  // Optional props accept undefined so wrappers can forward destructured
  // optionals under exactOptionalPropertyTypes.
  ref?: ((el: E) => void) | undefined;
  onMount?: ((el: E) => Cleanup) | undefined;
  class?: ClassValue;
  style?: StyleValue;
  text?: MaybeReactive<unknown>;
  role?: MaybeReactive<string | null | undefined>;
} & DataProps
  & AriaProps
  & EventProps<E>;

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

type WritableKeys<T> = {
  [K in keyof T]-?: Equal<
    { [P in K]: T[P] },
    { -readonly [P in K]: T[P] }
  > extends true ? K : never;
}[keyof T];

type ReservedProperty = "role" | "style" | "text";
type AnyFunction = (...args: never[]) => unknown;

type ElementPropertyKeys<E extends Element> = {
  [K in WritableKeys<E>]: K extends string
    ? K extends ReservedProperty | `on${string}`
      ? never
      : Extract<E[K], AnyFunction> extends never
        ? K
        : never
    : never;
}[WritableKeys<E>];

type ElementPropertyProps<E extends Element> = {
  [K in ElementPropertyKeys<E>]?: MaybeReactive<E[K]>;
};

type BindProps<E extends Element> = E extends HTMLInputElement
  ? {
      bindValue?: WritableSignal<string>;
      bindChecked?: WritableSignal<boolean>;
    }
  : E extends HTMLTextAreaElement | HTMLSelectElement
    ? {
        bindValue?: WritableSignal<string>;
        bindChecked?: never;
      }
    : {
        bindValue?: never;
        bindChecked?: never;
      };

export type Props<E extends Element = HTMLElement> = CommonProps<E>
  & ElementPropertyProps<E>
  & BindProps<E>;

export type Component<
  P extends object = Props<HTMLElement>,
  E extends HTMLElement = HTMLElement,
> = (props?: P | Child, ...children: Child[]) => E;
