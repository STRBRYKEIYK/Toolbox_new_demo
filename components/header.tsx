"use client"

import React, { useState, useEffect } from "react"
import { Search, Package, ShoppingCart, X, FileText, Home } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { ThemeToggle } from "./theme-toggle"
import { TipsAndTricks } from "./tips-and-tricks"
import { IndustrialTooltip } from "./ui/tooltip"
import { useToolboxAppState } from "../hooks/use-toolbox-app-state"
import type { ViewType } from "../app/page"

interface HeaderProps {
  cartItemCount: number
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  onSearch?: (query: string) => void
  onOpenStartPage?: () => void
}

export function Header({ cartItemCount, currentView, onViewChange, onSearch, onOpenStartPage }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false)
  const [products, setProducts] = useState<Array<{id: string, name: string, brand: string, itemType: string}>>([])
  const { checkoutSuccessCount } = useToolboxAppState()
  const logoSrc = `${import.meta.env.BASE_URL}ToolBoxlogo.png`
  
  // Load products for autocomplete
  useEffect(() => {
    const loadProductsForSearch = () => {
      try {
        const cached = localStorage.getItem('cached-products')
        if (cached) {
          const productData = JSON.parse(cached)
          setProducts(productData.map((p: any) => ({
            id: p.id || p.item_no,
            name: p.name || p.item_name || 'Unknown',
            brand: p.brand || 'Unknown',
            itemType: p.itemType || p.item_type || 'General'
          })))
        }
      } catch (error) {
        console.warn('Failed to load products for search:', error)
      }
    }
    loadProductsForSearch()
  }, [])
  
  // Generate smart suggestions
  const suggestions = React.useMemo(() => {
    if (searchQuery.length < 2) return []
    
    const query = searchQuery.toLowerCase()
    const matches = new Set<string>()
    
    products.forEach(product => {
      if (product.name.toLowerCase().includes(query)) {
        matches.add(product.name)
      }
      if (product.brand.toLowerCase().includes(query)) {
        matches.add(`${product.brand} (Brand)`)
      }
      if (product.itemType.toLowerCase().includes(query)) {
        matches.add(`${product.itemType} (Category)`)
      }
    })
    
    return Array.from(matches).slice(0, 5)
  }, [searchQuery, products])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery, onSearch])

  useEffect(() => {
    try {
      const hidden = localStorage.getItem("toolbox-hide-onboarding") === "true"
      setShowFirstTimeGuide(!hidden)
    } catch {
      setShowFirstTimeGuide(true)
    }
  }, [])

  useEffect(() => {
    if (checkoutSuccessCount > 0) {
      dismissGuide()
    }
  }, [checkoutSuccessCount])

  const dismissGuide = () => {
    setShowFirstTimeGuide(false)
    try {
      localStorage.setItem("toolbox-hide-onboarding", "true")
    } catch {
      // Ignore storage errors and keep runtime state only.
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(value.length > 0)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setShowSuggestions(false)
    if (onSearch) {
      onSearch("")
    }
  }

  const selectSuggestion = (suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/\s*\([^)]*\)\s*$/, '')
    setSearchQuery(cleanSuggestion)
    setShowSuggestions(false)
    if (onSearch) {
      onSearch(cleanSuggestion)
    }
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
      
      {/* Top Warning/Tips Banner (Looks like hazard tape/ticker) */}
      <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-1.5 flex items-center justify-center">
        <TipsAndTricks variant="banner" />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between px-3 lg:px-6 py-3 max-w-[1600px] mx-auto gap-4">
        
        {/* Logo & Brand Identity */}
        <div 
          className="flex items-center gap-4 cursor-pointer shrink-0 group w-full sm:w-auto" 
          onClick={() => onViewChange("dashboard")}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
              <img 
                src={logoSrc} 
                alt="Toolbox Logo" 
                className="w-8 h-8 object-contain drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <Package className="w-6 h-6 text-zinc-500 hidden" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-zinc-100 tracking-[0.15em] uppercase leading-none drop-shadow-sm">TOOLBOX</span>
            <span className="text-[9px] font-mono font-bold text-orange-500 tracking-widest uppercase mt-1">Inventory Sys</span>
          </div>
        </div>

        {/* Search Terminal */}
        <div className="flex-1 w-full max-w-2xl relative">
          <div className="relative flex items-center bg-black/50 border border-zinc-800 rounded-lg shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/50 transition-all">
            <Search className="absolute left-3 w-4 h-4 text-orange-500" />
            <Input
              placeholder="SEARCH MANIFEST..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-10 pr-10 h-11 bg-transparent border-0 text-zinc-200 placeholder:text-zinc-600 font-mono text-xs tracking-wider uppercase focus-visible:ring-0"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 h-8 w-8 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Hardware Dropdown Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-[0_15px_30px_rgba(0,0,0,0.8)] overflow-hidden z-50">
              <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800">
                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Matches Found</span>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left font-mono text-xs text-zinc-300 hover:bg-zinc-800 hover:text-orange-400 transition-colors flex items-center gap-3 border-b border-zinc-800/50 last:border-0"
                >
                  <Search className="w-3.5 h-3.5 text-zinc-600" />
                  <span>{suggestion.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls / Nav Switches */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          
          <div className="hidden sm:flex items-center gap-2">
            <IndustrialTooltip content="Terminal Configuration">
              <div><ThemeToggle /></div>
            </IndustrialTooltip>
          </div>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block mx-1"></div>
          
          {/* Nav "Switches" */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 shadow-inner w-full sm:w-auto justify-between sm:justify-start">
            
            {onOpenStartPage && (
              <IndustrialTooltip content="Back to start page">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenStartPage}
                  className="h-9 px-3 sm:px-4 rounded-md font-black tracking-widest uppercase text-[10px] transition-all text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                >
                  <Home className="w-4 h-4 mr-2" />
                  <span>Start</span>
                </Button>
              </IndustrialTooltip>
            )}

            <IndustrialTooltip content="Access Main Inventory">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange("dashboard")}
                className={`h-9 px-3 sm:px-4 rounded-md font-black tracking-widest uppercase text-[10px] transition-all ${
                  currentView === "dashboard" 
                    ? "bg-zinc-800 text-orange-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-zinc-700" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                <span>Items</span>
              </Button>
            </IndustrialTooltip>

            <IndustrialTooltip content="System Activity Logs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange("logs")}
                className={`h-9 px-3 sm:px-4 rounded-md font-black tracking-widest uppercase text-[10px] transition-all ${
                  currentView === "logs" 
                    ? "bg-zinc-800 text-orange-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-zinc-700" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                <span>Logs</span>
              </Button>
            </IndustrialTooltip>

            <IndustrialTooltip content={`Current Manifest (${cartItemCount})`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange("cart")}
                className={`relative h-9 px-3 sm:px-4 rounded-md font-black tracking-widest uppercase text-[10px] transition-all ${
                  currentView === "cart" 
                    ? "bg-zinc-800 text-orange-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-zinc-700" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span>Cart</span>
                
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-mono bg-orange-600 text-white border-0 rounded shadow-[0_2px_5px_rgba(234,88,12,0.5)]">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </Badge>
                )}
              </Button>
            </IndustrialTooltip>
          </div>

        </div>
      </div>

      {showFirstTimeGuide && currentView === "dashboard" && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/95 px-3 lg:px-6 py-2.5">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wide">
                Quick Start for New Users
              </p>
              <p className="text-xs text-zinc-300 mt-0.5">
                1) Open Items, 2) Add products to Cart, 3) Go to Cart to checkout.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap md:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange("dashboard")}
                className="h-8 px-2.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                Step 1: Items
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange("cart")}
                className="h-8 px-2.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                Step 2-3: Cart
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissGuide}
                className="h-8 px-2.5 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}