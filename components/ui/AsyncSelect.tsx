import React, { forwardRef, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactAsyncSelect from 'react-select/async';
import ReactAsyncCreatableSelect from 'react-select/async-creatable';
import { cn } from '@/lib/utils';

interface AsyncSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  loadOptions: (inputValue: string) => Promise<any[]>;
  value?: any;
  onChange?: (val: any, actionMeta?: any) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  defaultOptions?: boolean | any[];
  isClearable?: boolean;
  isDisabled?: boolean;
  isMulti?: boolean;
  isCreatable?: boolean;
  formatOptionLabel?: (option: any, meta: any) => React.ReactNode;
}

export const AsyncSelect = forwardRef<any, AsyncSelectProps>(
  (
    {
      label,
      error,
      hint,
      required,
      loadOptions,
      value,
      onChange,
      placeholder,
      className,
      id,
      defaultOptions = true,
      isClearable = false,
      isDisabled = false,
      isMulti = false,
      isCreatable = false,
      formatOptionLabel,
      ...props
    },
    ref
  ) => {
    const [isMounted, setIsMounted] = useState(false);
    const [tick, setTick] = useState(0);
    const optionsMapRef = useRef<Map<string, any>>(new Map());
    const initialFetchedRef = useRef(false);

    const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Seed optionsMapRef from defaultOptions if it's an array
    useEffect(() => {
      if (Array.isArray(defaultOptions)) {
        let added = false;
        defaultOptions.forEach((opt: any) => {
          if (opt && opt.value !== undefined) {
            const key = String(opt.value);
            if (!optionsMapRef.current.has(key)) {
              optionsMapRef.current.set(key, opt);
              added = true;
            }
          }
        });
        if (added) forceUpdate();
      }
    }, [defaultOptions, forceUpdate]);

    // Intercept loadOptions to cache returned options
    const wrappedLoadOptions = useCallback(
      async (inputValue: string) => {
        try {
          const results = await loadOptions(inputValue);
          if (Array.isArray(results)) {
            let added = false;
            results.forEach((opt: any) => {
              if (opt && opt.value !== undefined) {
                const key = String(opt.value);
                const existing = optionsMapRef.current.get(key);
                if (!existing || existing.label !== opt.label) {
                  optionsMapRef.current.set(key, opt);
                  added = true;
                }
              }
            });
            if (added) {
              forceUpdate();
            }
          }
          return results || [];
        } catch (err) {
          console.error('AsyncSelect loadOptions error:', err);
          return [];
        }
      },
      [loadOptions, forceUpdate]
    );

    // Initial fetch to populate options cache when defaultOptions is true or when empty
    useEffect(() => {
      if (defaultOptions === true || (Array.isArray(defaultOptions) && defaultOptions.length >= 0)) {
        if (!initialFetchedRef.current) {
          initialFetchedRef.current = true;
          wrappedLoadOptions('');
        }
      }
    }, [defaultOptions, wrappedLoadOptions]);

    const handleChange = (selected: any, actionMeta: any) => {
      // Creatable options carry a menu label like `Create "xxx"`; use the typed text as the label.
      const normalizeNew = (opt: any) =>
        opt && opt.__isNew__ ? { ...opt, label: String(opt.value) } : opt;
      selected = Array.isArray(selected) ? selected.map(normalizeNew) : normalizeNew(selected);
      if (selected) {
        if (Array.isArray(selected)) {
          selected.forEach((s: any) => {
            if (s && s.value !== undefined) {
              optionsMapRef.current.set(String(s.value), s);
            }
          });
        } else if (selected.value !== undefined) {
          optionsMapRef.current.set(String(selected.value), selected);
        }
      }
      if (onChange) {
        onChange(selected, actionMeta);
      }
    };

    const resolveSingleValue = useCallback((val: any) => {
      if (val === null || val === undefined || val === '') return null;

      // 1. If val is a primitive (string or number)
      if (typeof val !== 'object') {
        const key = String(val);
        if (optionsMapRef.current.has(key)) {
          return optionsMapRef.current.get(key);
        }
        return { value: val, label: String(val) };
      }

      // 2. If val is an object
      const valKey = String(val.value ?? '');
      const labelStr = String(val.label ?? '');

      // If the label is just the raw value or empty (e.g. { value: "3", label: "3" })
      if (!val.label || labelStr === valKey) {
        if (optionsMapRef.current.has(valKey)) {
          return optionsMapRef.current.get(valKey);
        }
        return val;
      }

      // If it already has a meaningful label, cache it
      if (!optionsMapRef.current.has(valKey) || optionsMapRef.current.get(valKey)?.label !== val.label) {
        optionsMapRef.current.set(valKey, val);
      }
      return val;
    }, []);

    const resolvedValue = useMemo(() => {
      if (isMulti) {
        if (!Array.isArray(value)) return [];
        return value.map(resolveSingleValue).filter(Boolean);
      }
      return resolveSingleValue(value);
    }, [value, isMulti, tick, resolveSingleValue]);
    const AsyncSelectComponent = isCreatable ? ReactAsyncCreatableSelect : ReactAsyncSelect;

    const generatedId = React.useId();
    const cleanLabel = label ? label.replace(/\s*\*+$/, '') : undefined;
    const isRequired = required || /\*+\s*$/.test(label ?? '');
    const selectId = id || `async-select-${generatedId}`;

    const customStyles = {
      control: (base: any, state: any) => ({
        ...base,
        minHeight: '44px',
        borderWidth: '1.5px',
        borderRadius: 'var(--radius-md)',
        borderColor: error ? 'var(--danger)' : state.isFocused ? 'var(--border-focus)' : 'var(--border-light)',
        boxShadow: state.isFocused ? (error ? '0 0 0 3px rgba(239, 68, 68, 0.12)' : '0 0 0 3px rgb(59 130 246 / 0.12)') : 'none',
        '&:hover': {
          borderColor: error ? 'var(--danger)' : state.isFocused ? 'var(--border-focus)' : 'var(--primary-400)'
        },
        fontSize: '0.9375rem'
      }),
      option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? 'var(--primary-500)' : state.isFocused ? 'var(--primary-50)' : 'white',
        color: state.isSelected ? 'white' : 'var(--text-primary)',
        fontSize: '0.9375rem',
        '&:active': {
          backgroundColor: state.isSelected ? 'var(--primary-600)' : 'var(--primary-100)',
        }
      }),
      menuPortal: (base: any) => ({
        ...base,
        zIndex: 9999
      }),
      menu: (base: any) => ({
        ...base,
        zIndex: 9999
      })
    };

    if (!isMounted) {
      return (
        <div className="form-group">
          {cleanLabel && (
            <label className="form-label" htmlFor={selectId}>
              {cleanLabel}
              {isRequired && <span className="required">*</span>}
            </label>
          )}
          <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
        </div>
      );
    }

    return (
      <div className="form-group">
        {cleanLabel && (
          <label className="form-label" htmlFor={selectId}>
            {cleanLabel}
            {isRequired && <span className="required">*</span>}
          </label>
        )}
        <div className="input-wrapper" style={{ display: 'block' }}>
          <AsyncSelectComponent
            ref={ref}
            instanceId={selectId}
            inputId={selectId}
            cacheOptions
            defaultOptions={defaultOptions}
            loadOptions={wrappedLoadOptions}
            value={resolvedValue}
            onChange={handleChange}
            isClearable={isClearable}
            isDisabled={isDisabled}
            isMulti={isMulti}
            {...(isCreatable ? { allowCreateWhileLoading: true, formatCreateLabel: (v: string) => `Gunakan "${v}" (tidak ada di daftar)` } : {})}
            formatOptionLabel={formatOptionLabel}
            placeholder={placeholder || 'Cari...'}
            styles={customStyles}
            className={cn('react-select-container', className)}
            classNamePrefix="react-select"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            menuPosition="fixed"
            {...props}
          />
        </div>
        {error && (
          <p id={`${selectId}-error`} className="form-error">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="form-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

AsyncSelect.displayName = 'AsyncSelect';
