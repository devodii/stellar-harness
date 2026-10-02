'use client';

import { cn } from 'cn';
import { Suggestion } from '@/components/ai-elements/suggestion';
import type { ChatSuggestion } from '@/lib/suggestions';

export interface ChatSuggestionsProps {
  suggestions: ChatSuggestion[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatSuggestions({
  suggestions,
  onSelect,
  disabled,
  className,
}: ChatSuggestionsProps) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {suggestions.map((suggestion) => (
        <Suggestion
          key={suggestion.id}
          suggestion={suggestion.prompt}
          onClick={onSelect}
          disabled={disabled}
          title={suggestion.prompt}
          className="h-auto justify-start rounded-md px-3 py-2 text-left text-xs font-normal whitespace-normal"
        >
          {suggestion.label}
        </Suggestion>
      ))}
    </div>
  );
}
