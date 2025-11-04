'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Button } from '../../components/ui/button';

export interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
}

export interface MultiSelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function MultiSelect({
  value,
  onChange,
  placeholder = "Select options",
  children,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const itemsRef = React.useRef<Map<string, string>>(new Map());

  const handleSelect = React.useCallback((itemValue: string) => {
    onChange(
      value.includes(itemValue)
        ? value.filter((v) => v !== itemValue)
        : [...value, itemValue]
    );
  }, [value, onChange]);

  const handleRemove = React.useCallback((itemValue: string) => {
    onChange(value.filter((v) => v !== itemValue));
  }, [value, onChange]);

  const handleClearAll = React.useCallback(() => {
    onChange([]);
  }, [onChange]);

  const selectedLabels: Array<{ value: string; label: string }> = React.useMemo(() => {
    return value.map(v => ({
      value: v,
      label: itemsRef.current.get(v) || v
    }));
  }, [value]);

  // Extract the items as an array for rendering
  const items = React.useMemo(() => {
    const result: Array<{ value: string; label: string; disabled?: boolean }> = [];

    React.Children.forEach(children, (child) => {
      if (React.isValidElement<MultiSelectItemProps>(child)) {
        const { value: itemValue, children: itemChildren, disabled } = child.props;
        let label = itemValue;

        if (typeof itemChildren === 'string') {
          label = itemChildren;
        } else if (React.isValidElement(itemChildren)) {
          const childProps = itemChildren.props as { children?: unknown };
          if (childProps && typeof childProps.children === 'string') {
            label = childProps.children;
          }
        }

        result.push({
          value: itemValue,
          label,
          disabled
        });

        // Store the label for reference
        itemsRef.current.set(itemValue, label);
      }
    });

    return result;
  }, [children]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${value.length > 0 ? 'h-auto' : 'h-10'} ${className}`}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {value.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selectedLabels.map(({ value: val, label }) => (
              <Badge
                key={val}
                variant="secondary"
                className="mr-1 mb-1"
              >
                {label}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-1 h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(val);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          <div className={value.length > 0 ? 'flex items-center ml-2' : ''}>
            {value.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <span className="opacity-60">▼</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map(({ value: itemValue, label, disabled }) => (
                <CommandItem
                  key={itemValue}
                  value={label} // Use label for search matching
                  disabled={disabled}
                  onSelect={() => handleSelect(itemValue)}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="checkbox"
                      checked={value.includes(itemValue)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      readOnly
                    />
                    <span>{label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function MultiSelectItem({ value, children }: MultiSelectItemProps) {
  return <>{children}</>;
}