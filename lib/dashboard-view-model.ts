import type { Product } from "./barcode-scanner"

export type DashboardSortKey = "name-asc" | "name-desc" | "stock-high" | "stock-low"

interface ProductFilteringInput {
  products: Product[]
  excludedCategories: Set<string>
  showAvailable: boolean
  showUnavailable: boolean
  searchQuery: string
  localSearchQuery: string
  sortBy: DashboardSortKey
  currentPage: number
  itemsPerPage: number
}

export interface DashboardStats {
  total: number
  inStock: number
  lowStock: number
  outOfStock: number
}

export function computeCategories(products: Product[]): string[] {
  return ["all", ...new Set(products.map((p) => p.itemType))]
}

export function computeItemsTitle(categories: string[], excludedCategories: Set<string>): string {
  const all = categories.filter((category) => category !== "all")
  const included = all.filter((category) => !excludedCategories.has(category))

  if (included.length === 0) return "No Items to Show"
  if (excludedCategories.size === 0) return "All Items"
  if (included.length === 1) return included[0] || "Filtered Items"

  return "Filtered Items"
}

export function computeDashboardStats(products: Product[]): DashboardStats {
  return {
    total: products.length,
    inStock: products.filter((product) => product.status === "in-stock").length,
    lowStock: products.filter((product) => product.status === "low-stock").length,
    outOfStock: products.filter((product) => product.status === "out-of-stock").length,
  }
}

export function filterSortAndPaginateProducts({
  products,
  excludedCategories,
  showAvailable,
  showUnavailable,
  searchQuery,
  localSearchQuery,
  sortBy,
  currentPage,
  itemsPerPage,
}: ProductFilteringInput) {
  const effectiveQuery = searchQuery || localSearchQuery

  const filtered = products.filter((product) => {
    if (excludedCategories.has(product.itemType)) return false
    if (!showAvailable && (product.status === "in-stock" || product.status === "low-stock")) return false
    if (!showUnavailable && product.status === "out-of-stock") return false

    if (effectiveQuery) {
      const query = effectiveQuery.toLowerCase()
      return (
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.itemType.toLowerCase().includes(query) ||
        product.location.toLowerCase().includes(query)
      )
    }

    return true
  })

  filtered.sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name)
      case "name-desc":
        return b.name.localeCompare(a.name)
      case "stock-high":
        return b.balance - a.balance
      case "stock-low":
        return a.balance - b.balance
      default:
        return 0
    }
  })

  const totalFilteredCount = filtered.length
  const toShow = currentPage * itemsPerPage

  return {
    paginatedProducts: filtered.slice(0, toShow),
    totalFilteredCount,
    hasMorePages: toShow < totalFilteredCount,
  }
}
