"use client";

import { useState } from "react";

type FieldErrors = Record<string, string>;

const labels: Record<string, string> = {
  name: "name",
  email: "email address",
  password: "password",
  currentPassword: "current password",
  newPassword: "new password",
  confirmation: "password confirmation",
};

function messageFor(input: HTMLInputElement): string | null {
  const label = labels[input.name] ?? "value";
  if (input.required && !input.value.trim()) return `Enter your ${label}.`;
  if (input.validity.typeMismatch) return "Enter a valid email address.";
  if (input.minLength > 0 && input.value.length < input.minLength) {
    return input.name === "name"
      ? "Use at least 2 characters for your name."
      : "Use at least 8 characters.";
  }
  return null;
}

export function useFormValidation(idPrefix: string) {
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(form: HTMLFormElement): boolean {
    const next: FieldErrors = {};
    let firstInvalid: HTMLInputElement | null = null;
    for (const input of form.querySelectorAll<HTMLInputElement>(
      "input[name]",
    )) {
      const message = messageFor(input);
      if (!message) continue;
      next[input.name] = message;
      firstInvalid ??= input;
    }
    setErrors(next);
    firstInvalid?.focus();
    return firstInvalid === null;
  }

  function fieldProps(name: string) {
    return {
      "aria-invalid": errors[name] ? (true as const) : undefined,
      "aria-describedby": errors[name]
        ? `${idPrefix}-${name}-error`
        : undefined,
      onInput: (event: React.FormEvent<HTMLInputElement>) => {
        if (!errors[name]) return;
        const message = messageFor(event.currentTarget);
        setErrors((current) => {
          const next = { ...current };
          if (message) next[name] = message;
          else delete next[name];
          return next;
        });
      },
    };
  }

  function fieldError(name: string) {
    return errors[name] ? (
      <span
        id={`${idPrefix}-${name}-error`}
        className="field-error"
        role="alert"
      >
        {errors[name]}
      </span>
    ) : null;
  }

  return {
    validate,
    fieldProps,
    fieldError,
    clear: () => setErrors({}),
    setFieldError: (name: string, message: string) =>
      setErrors((current) => ({ ...current, [name]: message })),
  };
}
