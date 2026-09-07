"use client"

import * as React from "react"
import { Slot } from "radix-ui"
import {
    Controller,
    FormProvider,
    useFormContext,
    useFormState,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/**
 * react-hook-form bound to accessible markup.
 *
 * The value here is not the styling — it is that `FormControl` wires
 * `id`, `aria-describedby` and `aria-invalid` from the field's own state, so a
 * validation error is announced rather than merely coloured. Twenty-odd forms
 * hand-wiring those three attributes is twenty chances to forget one, and a
 * forgotten `aria-describedby` is invisible to everyone who can see the screen.
 *
 * Written by hand rather than pulled from the registry: the CLI blocks on an
 * interactive overwrite prompt for `button.tsx` and `label.tsx`, and
 * overwriting either to get past it would replace components the app already
 * depends on.
 */

const Form = FormProvider

type FormFieldContextValue<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName }

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

function FormField<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
    return (
        <FormFieldContext.Provider value={{ name: props.name }}>
            <Controller {...props} />
        </FormFieldContext.Provider>
    )
}

type FormItemContextValue = { id: string }

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function useFormField() {
    const fieldContext = React.useContext(FormFieldContext)
    const itemContext = React.useContext(FormItemContext)
    const { getFieldState } = useFormContext()
    const formState = useFormState({ name: fieldContext.name })
    const fieldState = getFieldState(fieldContext.name, formState)

    if (!fieldContext) {
        throw new Error("useFormField must be used within <FormField>")
    }

    const { id } = itemContext

    return {
        id,
        name: fieldContext.name,
        formItemId: `${id}-form-item`,
        formDescriptionId: `${id}-form-item-description`,
        formMessageId: `${id}-form-item-message`,
        ...fieldState,
    }
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
    const id = React.useId()

    return (
        <FormItemContext.Provider value={{ id }}>
            {/* gap-1 is the label-to-control step (4px), not shadcn's default 8px. */}
            <div data-slot="form-item" className={cn("grid gap-1", className)} {...props} />
        </FormItemContext.Provider>
    )
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
    const { error, formItemId } = useFormField()

    return (
        <Label
            data-slot="form-label"
            data-error={!!error}
            className={cn("text-xs font-medium data-[error=true]:text-danger", className)}
            htmlFor={formItemId}
            {...props}
        />
    )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

    return (
        <Slot.Root
            data-slot="form-control"
            id={formItemId}
            aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
            aria-invalid={!!error}
            {...props}
        />
    )
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
    const { formDescriptionId } = useFormField()

    return (
        <p
            data-slot="form-description"
            id={formDescriptionId}
            className={cn("text-2xs text-muted-foreground", className)}
            {...props}
        />
    )
}

/**
 * The message renders nothing when there is nothing to say, but the element
 * keeps its id so `aria-describedby` stays valid across the transition from
 * valid to invalid.
 */
function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
    const { error, formMessageId } = useFormField()
    const body = error ? String(error?.message ?? "") : props.children

    if (!body) return null

    return (
        <p
            data-slot="form-message"
            id={formMessageId}
            className={cn("text-2xs text-danger", className)}
            {...props}
        >
            {body}
        </p>
    )
}

export {
    useFormField,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
}
