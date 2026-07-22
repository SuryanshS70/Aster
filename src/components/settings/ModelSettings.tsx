import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_OPTIONS,
  geminiModelSchema,
  type GeminiModel,
} from "@/contracts";
import { useModelPreference, useUpdateModelPreference } from "@/hooks/useModelPreference";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

export function ModelSettings() {
  const preference = useModelPreference();
  const updatePreference = useUpdateModelPreference();
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(DEFAULT_GEMINI_MODEL);

  useEffect(() => {
    if (preference.data) setSelectedModel(preference.data.model);
  }, [preference.data]);

  function selectModel(value: string) {
    const parsed = geminiModelSchema.safeParse(value);
    if (!parsed.success) return;
    updatePreference.reset();
    setSelectedModel(parsed.data);
  }

  const hasChanged = preference.data?.model !== selectedModel;

  return (
    <section>
      <h2 className="font-serif text-2xl">AI model</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose the Gemini model Aster uses for new responses.
      </p>

      <div className="mt-4 rounded-xl border bg-card p-5">
        {preference.isLoading ? (
          <div className="space-y-3" aria-label="Loading model preference">
            {GEMINI_MODEL_OPTIONS.map((option) => (
              <Skeleton key={option.id} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : preference.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              Couldn&apos;t load your model preference. Please try again.
            </p>
            <Button variant="outline" onClick={() => preference.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <RadioGroup
              value={selectedModel}
              onValueChange={selectModel}
              disabled={updatePreference.isPending}
              className="gap-3"
              aria-label="Gemini model"
            >
              {GEMINI_MODEL_OPTIONS.map((option) => {
                const selected = selectedModel === option.id;
                return (
                  <label
                    key={option.id}
                    htmlFor={option.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                      selected
                        ? "border-primary bg-primary/5"
                        : "hover:border-foreground/20 hover:bg-muted/30",
                      updatePreference.isPending && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <RadioGroupItem id={option.id} value={option.id} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{option.name}</span>
                        {option.id === DEFAULT_GEMINI_MODEL && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Default
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => updatePreference.mutate(selectedModel)}
                disabled={!hasChanged || updatePreference.isPending}
              >
                {updatePreference.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {updatePreference.isPending ? "Saving?" : "Save model"}
              </Button>

              <div className="text-sm" aria-live="polite">
                {updatePreference.isSuccess && !hasChanged && (
                  <span className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Model preference saved.
                  </span>
                )}
                {updatePreference.isError && (
                  <span className="text-destructive">
                    Unable to save your model preference. Please try again.
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
