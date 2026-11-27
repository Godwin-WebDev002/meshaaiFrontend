'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LocationSearchResult } from '@/app/api/location/search/route';

export interface AddressSearchPickerProps {
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
  onSelectLocation: (coords: { lat: number; lng: number; address: string }) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}

export default function AddressSearchPicker({
  initialAddress = '',
  initialLat = 0,
  initialLng = 0,
  onSelectLocation,
  onCancel,
  autoFocus = true,
}: AddressSearchPickerProps) {
  const [query, setQuery] = useState(initialAddress);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress);
  const [confirmedCoords, setConfirmedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search places as user types
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsDropdownOpen((data.results || []).length > 0);
        }
      } catch (err) {
        console.error('Failed to search locations:', err);
      } finally {
        setIsLoading(false);
      }
    }, 320);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  function handleSelectResult(item: LocationSearchResult) {
    const finalAddress = item.fullAddress || item.title;
    setSelectedAddress(finalAddress);
    setConfirmedCoords({ lat: item.lat, lng: item.lng });
    setQuery(finalAddress);
    setIsDropdownOpen(false);
    onSelectLocation({
      lat: item.lat,
      lng: item.lng,
      address: finalAddress,
    });
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setIsDropdownOpen(false);
  }

  return (
    <div ref={containerRef} className="space-y-3 w-full text-slate-900">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
          <span className="text-[#e31b23]">📍</span> Search Delivery Address
        </label>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Google Maps Style Address Search Input */}
      <div className="relative">
        <div className="flex items-center bg-white border-2 border-slate-200 focus-within:border-[#e31b23] focus-within:ring-2 focus-within:ring-red-500/10 rounded-2xl px-3.5 py-2.5 shadow-sm transition-all">
          <span className="text-slate-400 text-sm mr-2 shrink-0">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isDropdownOpen) setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) setIsDropdownOpen(true);
            }}
            placeholder="e.g. 14 Adetokunbo Ademola Crescent, Wuse 2, Abuja..."
            autoFocus={autoFocus}
            className="w-full text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-[#e31b23] border-t-transparent rounded-full animate-spin shrink-0 ml-2" />
          )}
          {!isLoading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1 shrink-0 ml-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {isDropdownOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Select Your Exact Delivery Location:
            </div>
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-red-50/80 flex items-start gap-2.5 transition-colors group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-red-50 text-[#e31b23] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#e31b23] group-hover:text-white transition-colors">
                  <span className="text-xs">📍</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 group-hover:text-[#e31b23] truncate transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 leading-tight">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirmed Location Badge */}
      {confirmedCoords && selectedAddress && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 font-bold">
              ✓
            </span>
            <div className="truncate">
              <p className="font-extrabold text-emerald-900 truncate">
                {selectedAddress}
              </p>
              <p className="text-[10px] text-emerald-700 font-mono">
                GPS: {confirmedCoords.lat.toFixed(4)}, {confirmedCoords.lng.toFixed(4)}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
            Confirmed
          </span>
        </div>
      )}
    </div>
  );
}
