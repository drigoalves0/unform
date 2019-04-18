import dot from "dot-object";
import React, { FormEvent, useState, FormHTMLAttributes } from "react";
import { ObjectSchema, ValidationError } from "yup";

import FormContext from "./Context";
import { Field, Errors } from "./types";

interface Context {
  [key: string]: any;
}

interface Props extends FormHTMLAttributes<HTMLFormElement> {
  initialData: object;
  children: React.ReactNode;
  context: Context;
  schema?: ObjectSchema<object>;
  onSubmit: (data: object) => void;
}

export default function Form({
  initialData,
  children,
  schema,
  context,
  onSubmit,
  ...rest
}: Props) {
  const [errors, setErrors] = useState<Errors>({});

  let refs: Field[] = [];

  function parseFormData() {
    const data = {};

    refs.forEach(({ name, ref, path }) => {
      data[name] = dot.pick(path, typeof ref === "function" ? ref() : ref);
    });

    dot.object(data);

    return data;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const data = parseFormData();

    try {
      if (schema) {
        await schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          context
        });
      }

      const finalData = schema.cast(data, {
        stripUnknown: true,
        context
      });

      onSubmit(finalData);
    } catch (err) {
      const validationErrors: Errors = {};

      err.inner.forEach((error: ValidationError) => {
        validationErrors[error.path] = error.message;
      });

      setErrors(validationErrors);
    }
  }

  function registerField(field: Field) {
    refs.push(field);
  }

  function unregisterField(name: string) {
    refs = refs.filter(ref => ref.name !== name);
  }

  return (
    <FormContext.Provider
      value={{
        initialData,
        errors,
        scopePath: "",
        registerField,
        unregisterField
      }}
    >
      <form {...rest} onSubmit={handleSubmit}>
        {children}
      </form>
    </FormContext.Provider>
  );
}
