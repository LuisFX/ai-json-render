"use client";

import { useState } from "react";
import { defineRegistry, useBoundProp } from "@json-render/react";
import { toast } from "sonner";

import { formSpecCatalog } from "./form-spec-catalog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table as TablePrimitive,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FieldOption = {
  value: string;
  description?: string | null;
  score?: number | null;
};

function getOptionValue(opt: FieldOption | string): string {
  return typeof opt === "string" ? opt : opt.value;
}

function getOptionLabel(opt: FieldOption | string): string {
  return typeof opt === "string" ? opt : (opt.description ?? opt.value);
}

export const { registry: formRegistry, executeAction } = defineRegistry(
  formSpecCatalog,
  {
    components: {
      Step: ({ props, children }) => {
        const value = `step-${props.order}`;
        return (
          <AccordionPrimitive
            type="single"
            collapsible
            defaultValue={props.order === 1 ? value : undefined}
            className="w-full"
          >
            <AccordionItem
              value={value}
              className="border rounded-lg px-4 py-2"
            >
              <AccordionTrigger className="hover:no-underline">
                <span className="font-medium">
                  {props.order}. {props.label}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2">{children}</AccordionContent>
            </AccordionItem>
          </AccordionPrimitive>
        );
      },

      Form: ({ children, emit }) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            emit("submit");
          }}
          className="flex flex-col gap-4"
        >
          {children}
        </form>
      ),

      Stack: ({ props, children }) => {
        const direction = props.direction ?? "vertical";
        const gap = props.gap ?? "md";
        const gapClass =
          gap === "none"
            ? ""
            : gap === "sm"
              ? "gap-2"
              : gap === "lg"
                ? "gap-6"
                : "gap-4";
        return (
          <div
            className={`flex ${direction === "horizontal" ? "flex-row" : "flex-col"} ${gapClass}`}
          >
            {children}
          </div>
        );
      },

      Input: ({ props, bindings }) => {
        const [boundValue, setBoundValue] = useBoundProp<string>(
          props.value as string | undefined,
          bindings?.value,
        );
        const [localValue, setLocalValue] = useState("");
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? "") : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        return (
          <div className="space-y-2">
            {props.label && <Label htmlFor={props.name}>{props.label}</Label>}
            <Input
              id={props.name}
              name={props.name}
              type={props.type ?? "text"}
              placeholder={props.placeholder ?? ""}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        );
      },

      Textarea: ({ props, bindings }) => {
        const [boundValue, setBoundValue] = useBoundProp<string>(
          props.value as string | undefined,
          bindings?.value,
        );
        const [localValue, setLocalValue] = useState("");
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? "") : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        return (
          <div className="space-y-2">
            {props.label && <Label htmlFor={props.name}>{props.label}</Label>}
            <Textarea
              id={props.name}
              name={props.name}
              placeholder={props.placeholder ?? ""}
              rows={props.rows ?? 3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        );
      },

      Radio: ({ props, bindings, emit }) => {
        const rawOptions = (props.options ?? []) as (FieldOption | string)[];
        const [boundValue, setBoundValue] = useBoundProp<string>(
          props.value as string | undefined,
          bindings?.value,
        );
        const [localValue, setLocalValue] = useState(
          rawOptions[0] ? getOptionValue(rawOptions[0]) : "",
        );
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? "") : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        return (
          <div className="space-y-2">
            {props.label && <Label>{props.label}</Label>}
            <RadioGroup
              value={value}
              onValueChange={(v) => {
                setValue(v);
                emit("change");
              }}
            >
              {rawOptions.map((opt, idx) => {
                const optValue = getOptionValue(opt);
                const optLabel = getOptionLabel(opt);
                return (
                  <div
                    key={`${idx}-${optValue}`}
                    className="flex items-center space-x-2"
                  >
                    <RadioGroupItem
                      value={optValue}
                      id={`${props.name}-${idx}`}
                    />
                    <Label
                      htmlFor={`${props.name}-${idx}`}
                      className="cursor-pointer"
                    >
                      {optLabel}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );
      },

      Select: ({ props, bindings, emit }) => {
        const rawOptions = (props.options ?? []) as (FieldOption | string)[];
        const [boundValue, setBoundValue] = useBoundProp<string>(
          props.value as string | undefined,
          bindings?.value,
        );
        const [localValue, setLocalValue] = useState("");
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? "") : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        return (
          <div className="space-y-2">
            <Label>{props.label}</Label>
            <Select
              value={value}
              onValueChange={(v) => {
                setValue(v);
                emit("change");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={props.placeholder ?? "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {rawOptions.map((opt, idx) => {
                  const optValue = getOptionValue(opt);
                  const optLabel = getOptionLabel(opt);
                  return (
                    <SelectItem key={`${idx}-${optValue}`} value={optValue}>
                      {optLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );
      },

      Checkbox: ({ props, bindings, emit }) => {
        const [boundChecked, setBoundChecked] = useBoundProp<boolean>(
          props.checked as boolean | undefined,
          bindings?.checked,
        );
        const [localChecked, setLocalChecked] = useState(!!props.checked);
        const isBound = !!bindings?.checked;
        const checked = isBound ? (boundChecked ?? false) : localChecked;
        const setChecked = isBound ? setBoundChecked : setLocalChecked;

        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={props.name}
              checked={checked}
              onCheckedChange={(c) => {
                setChecked(c === true);
                emit("change");
              }}
            />
            <Label htmlFor={props.name} className="cursor-pointer">
              {props.label}
            </Label>
          </div>
        );
      },

      CheckboxList: ({ props, bindings, emit }) => {
        const rawOptions = (props.options ?? []) as (FieldOption | string)[];
        const [boundValue, setBoundValue] = useBoundProp<string[]>(
          props.value as string[] | undefined,
          bindings?.value,
        );
        const [localValue, setLocalValue] = useState<string[]>(
          (props.value as string[]) ?? [],
        );
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? []) : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        const toggle = (optValue: string) => {
          const next = value.includes(optValue)
            ? value.filter((v) => v !== optValue)
            : [...value, optValue];
          setValue(next);
          emit("change");
        };

        return (
          <div className="space-y-2">
            {props.label && <Label>{props.label}</Label>}
            <div className="flex flex-col gap-2">
              {rawOptions.map((opt, idx) => {
                const optValue = getOptionValue(opt);
                const optLabel = getOptionLabel(opt);
                return (
                  <div
                    key={`${idx}-${optValue}`}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`${props.name}-${idx}`}
                      checked={value.includes(optValue)}
                      onCheckedChange={() => toggle(optValue)}
                    />
                    <Label
                      htmlFor={`${props.name}-${idx}`}
                      className="cursor-pointer"
                    >
                      {optLabel}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      },

      TagList: ({ props, bindings, emit }) => {
        const rawOptions = (props.options ?? []) as (FieldOption | string)[];
        const [boundValue, setBoundValue] = useBoundProp<string[]>(
          props.value as string[] | undefined,
          bindings?.value,
        );
        const [localValue, setLocalValue] = useState<string[]>(
          (props.value as string[]) ?? [],
        );
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? []) : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        const toggle = (optValue: string) => {
          const next = value.includes(optValue)
            ? value.filter((v) => v !== optValue)
            : [...value, optValue];
          setValue(next);
          emit("change");
        };

        return (
          <div className="space-y-2">
            {props.label && <Label>{props.label}</Label>}
            <div className="flex flex-wrap gap-2">
              {rawOptions.map((opt, idx) => {
                const optValue = getOptionValue(opt);
                const optLabel = getOptionLabel(opt);
                const selected = value.includes(optValue);
                return (
                  <button
                    key={`${idx}-${optValue}`}
                    type="button"
                    onClick={() => toggle(optValue)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {optLabel}
                  </button>
                );
              })}
            </div>
          </div>
        );
      },

      TextAutoComplete: ({ props, bindings, emit }) => {
        const rawOptions = (props.options ?? []) as (FieldOption | string)[];
        const [boundValue, setBoundValue] = useBoundProp<string>(
          props.value as string | undefined,
          bindings?.value,
        );
        const [localValue, setLocalValue] = useState("");
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? "") : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        return (
          <div className="space-y-2">
            {props.label && <Label htmlFor={props.name}>{props.label}</Label>}
            <Input
              id={props.name}
              name={props.name}
              list={`${props.name}-datalist`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                emit("change");
              }}
            />
            <datalist id={`${props.name}-datalist`}>
              {rawOptions.map((opt, idx) => (
                <option key={idx} value={getOptionValue(opt)}>
                  {getOptionLabel(opt)}
                </option>
              ))}
            </datalist>
          </div>
        );
      },

      Matrix: ({ props, bindings, emit }) => {
        const items = (props.items ?? []) as (FieldOption | string)[];
        const options = (props.options ?? []) as (FieldOption | string)[];
        const [boundValue, setBoundValue] = useBoundProp<
          Record<string, string>
        >(props.value as Record<string, string> | undefined, bindings?.value);
        const [localValue, setLocalValue] = useState<Record<string, string>>(
          (props.value as Record<string, string>) ?? {},
        );
        const isBound = !!bindings?.value;
        const value = isBound ? (boundValue ?? {}) : localValue;
        const setValue = isBound ? setBoundValue : setLocalValue;

        const setCell = (itemKey: string, optValue: string) => {
          const next = { ...value, [itemKey]: optValue };
          setValue(next);
          emit("change");
        };

        return (
          <div className="space-y-2 overflow-x-auto">
            {props.label && <Label>{props.label}</Label>}
            <TablePrimitive>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]"></TableHead>
                  {options.map((opt, j) => (
                    <TableHead key={j} className="text-center">
                      {getOptionLabel(opt)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => {
                  const itemKey = getOptionValue(item);
                  const itemLabel = getOptionLabel(item);
                  const selected = value[itemKey];
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{itemLabel}</TableCell>
                      {options.map((opt, j) => {
                        const optValue = getOptionValue(opt);
                        const isSelected = selected === optValue;
                        return (
                          <TableCell key={j} className="text-center">
                            <input
                              type="radio"
                              name={`${props.name}-${itemKey}`}
                              checked={isSelected}
                              onChange={() => setCell(itemKey, optValue)}
                              className="cursor-pointer"
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </TablePrimitive>
          </div>
        );
      },

      Signature: ({ props }) => (
        <div className="space-y-2">
          {props.label && <Label>{props.label}</Label>}
          <div className="border border-dashed border-border rounded-lg h-24 flex items-center justify-center text-sm text-muted-foreground">
            Signature pad (placeholder)
          </div>
        </div>
      ),
      ScoreSummary: ({ props }) => {
        const current = props.currentScore ?? null;
        const max = props.maxScore ?? 0;
        const ranges = (props.ranges ?? []) as Array<{
          min: number;
          max: number;
          label: string;
          tag: string | null;
        }>;
        const activeRange =
          current !== null
            ? ranges.find((r) => current >= r.min && current <= r.max)
            : null;
        const tagClass =
          activeRange?.tag === "danger"
            ? "bg-red-500/20 text-red-700 dark:text-red-400"
            : activeRange?.tag === "warning"
              ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
              : activeRange?.tag === "success"
                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                : activeRange?.tag === "info"
                  ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                  : "bg-muted text-muted-foreground";

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                Score: {current !== null ? current : "-"} / {max}
              </span>
              {activeRange && (
                <span className={`text-xs px-2 py-0.5 rounded ${tagClass}`}>
                  {activeRange.label}
                </span>
              )}
            </div>
            {ranges.length > 0 && (
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                {ranges.map((r, i) => (
                  <span key={i}>
                    {r.min}-{r.max}: {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },

      Message: ({ props }) => {
        const variant =
          props.messageType === "error"
            ? "destructive"
            : props.messageType === "success"
              ? "default"
              : "default";
        const customClass =
          props.messageType === "success"
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
            : props.messageType === "warning"
              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
              : props.messageType === "info"
                ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                : "";

        return (
          <Alert variant={variant} className={customClass}>
            <AlertTitle>{props.heading}</AlertTitle>
            <AlertDescription>{props.message}</AlertDescription>
            {props.footer && <p className="text-sm mt-2">{props.footer}</p>}
          </Alert>
        );
      },

      ReadOnly: ({ props }) => {
        const [open, setOpen] = useState(props.initiallyExpanded ?? true);
        const collapsible = props.collapsible ?? false;

        const content =
          props.formatting === "html" ? (
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: props.content }}
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap">{props.content}</div>
          );

        if (!collapsible) {
          return (
            <div className="space-y-2">
              <div className="font-medium">{props.heading}</div>
              {content}
            </div>
          );
        }

        return (
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="w-full px-4 py-2 flex items-center justify-between text-left font-medium"
            >
              {props.heading}
              <span className="text-muted-foreground">{open ? "-" : "+"}</span>
            </button>
            {open && <div className="px-4 pb-4">{content}</div>}
          </div>
        );
      },

      PluginField: ({ props }) => (
        <div className="space-y-2">
          {props.fieldName && <Label>{props.fieldName}</Label>}
          <div className="border border-dashed border-border rounded-lg p-4 text-sm text-muted-foreground">
            Plugin: {props.pluginId} (not loaded)
          </div>
        </div>
      ),

      Button: ({ props, emit }) => (
        <Button
          variant={
            props.variant === "danger"
              ? "destructive"
              : props.variant === "secondary"
                ? "secondary"
                : "default"
          }
          disabled={props.disabled ?? false}
          type="submit"
          onClick={() => emit("press")}
        >
          {props.label}
        </Button>
      ),
    },
    actions: {
      setState: async () => {},
      pushState: async () => {},
      removeState: async () => {},
      formSubmit: async () => {
        toast.success("Form submitted successfully!");
      },
    },
  },
);
