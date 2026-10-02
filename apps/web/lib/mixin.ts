export type MixinProps<Mixin extends string, Props> = {
  [Key in keyof Props as `${Mixin}${Capitalize<Key & string>}`]: Props[Key];
};

type SplitProps<Props, Mixins extends string[]> = {
  [Mixin in Mixins[number]]: {
    [MixinKey in keyof Props as MixinKey extends `${Mixin}${infer Key}`
      ? Uncapitalize<Key>
      : never]: Props[MixinKey];
  };
} & {
  rest: Omit<
    Props,
    {
      [Mixin in Mixins[number]]: keyof {
        [MixinKey in keyof Props as MixinKey extends `${Mixin}${string}` ? MixinKey : never]: never;
      };
    }[Mixins[number]]
  >;
};

export const splitProps = <Props extends object, Mixins extends string[]>(
  props: Props,
  ...mixins: Mixins
): SplitProps<Props, Mixins> => {
  const result: Record<string, Record<string, unknown>> = { rest: {} };
  for (const mixin of mixins) result[mixin] = {};

  for (const [key, value] of Object.entries(props)) {
    const mixin = mixins.find((candidate) => key.startsWith(candidate));
    if (!mixin) {
      (result.rest as Record<string, unknown>)[key] = value;
      continue;
    }
    const remainder = key.slice(mixin.length);
    (result[mixin] as Record<string, unknown>)[
      remainder.charAt(0).toLowerCase() + remainder.slice(1)
    ] = value;
  }

  return result as SplitProps<Props, Mixins>;
};
