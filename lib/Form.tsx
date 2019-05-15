import dot from "dot-object";
import React, { FormEvent, useState, useEffect } from "react";
import { ObjectSchema, ValidationError } from "yup";

import FormContext from "./Context";
import { Field, Errors } from "./types";

interface Context {
  [key: string]: any;
}

interface Helpers {
  resetForm: () => void;
}

interface Props {
  initialData?: object;
  children: React.ReactNode;
  context?: Context;
  schema?: ObjectSchema<object>;
  onSubmit: (data: object, helpers: Helpers) => void;
}

export default function Form({
  initialData = {},
  children,
  schema,
  context = {},
  onSubmit
}: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const [fields, setFields] = useState<Field[]>([]);

  function parseFormData() {
    const data = {};

    fields.forEach(({ name, ref, getValue, path }) => {
      const value = getValue ? getValue() : ref;

      data[name] = path ? dot.pick(path, value) : value;
    });

    dot.object(data);

    return data;
  }

  function resetForm() {
    fields.forEach(({ ref, setValue }) => {
      if (ref) {
        ref.value = "";
      } else if (setValue) {
        setValue("");
      }
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    let data = parseFormData();

    try {
      if (schema) {
        await schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          context
        });

        data = schema.cast(data, {
          stripUnknown: true,
          context
        });
      }

      setErrors({});
      onSubmit(data, { resetForm });
    } catch (err) {
      const validationErrors: Errors = {};

      if (!err.inner) {
        throw err;
      }

      err.inner.forEach((error: ValidationError) => {
        validationErrors[error.path] = error.message;
      });

      setErrors(validationErrors);
    }
  }

  function registerField(field: Field) {
    setFields(state => [...state, field]);
  }

  function unregisterField(name: string) {
    setFields(fields.filter(field => field.name !== name));
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
      <form data-testid="form" onSubmit={handleSubmit}>
        {children}
      </form>
    </FormContext.Provider>
  );
}
