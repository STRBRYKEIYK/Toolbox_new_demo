import { useMemo, useState } from "react"

interface SelectableCartItem {
  id: string
  quantity: number
  brand?: string
}

export function useCartSelection(items: SelectableCartItem[]) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const selectedCartItems = useMemo(
    () => items.filter((item) => selectedItems.has(item.id)),
    [items, selectedItems]
  )

  const selectedTotalItems = useMemo(
    () => selectedCartItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedCartItems]
  )

  const allSelected = items.length > 0 && selectedItems.size === items.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map((item) => item.id)))
      return
    }
    setSelectedItems(new Set())
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const applyBrandSelection = (brandValue: string) => {
    if (!brandValue || brandValue === "__all__") return

    const normalizedBrand = String(brandValue).trim().toLowerCase()
    const matchingIds = items
      .filter((item) => String(item.brand || "UNSPECIFIED ORIGIN").trim().toLowerCase() === normalizedBrand)
      .map((item) => item.id)

    setSelectedItems(new Set(matchingIds))
  }

  const invertSelection = () => {
    setSelectedItems((prev) => {
      const next = new Set<string>()
      items.forEach((item) => {
        if (!prev.has(item.id)) next.add(item.id)
      })
      return next
    })
  }

  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  const removeSelectedIds = (ids: string[]) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  return {
    selectedItems,
    setSelectedItems,
    selectedCartItems,
    selectedTotalItems,
    allSelected,
    handleSelectAll,
    handleSelectItem,
    applyBrandSelection,
    invertSelection,
    clearSelection,
    removeSelectedIds,
  }
}
