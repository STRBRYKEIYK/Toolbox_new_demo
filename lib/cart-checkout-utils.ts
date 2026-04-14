interface CheckoutEmployeeLike {
  id: string | number
  fullName: string
  idNumber: string
  idBarcode: string
}

interface CheckoutItemLike {
  id: string
  name: string
  brand: string
  itemType: string
  location: string
  quantity: number
  balance: number
}

export function buildCheckoutArtifacts(
  itemsToCheckout: CheckoutItemLike[],
  employee: CheckoutEmployeeLike,
  purpose?: string
) {
  const checkoutTotalItems = itemsToCheckout.reduce((sum, item) => sum + item.quantity, 0)

  const enhancedItems = itemsToCheckout.map((item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand || "N/A",
    itemType: item.itemType || "N/A",
    location: item.location || "N/A",
    quantity: item.quantity,
    originalBalance: item.balance,
    newBalance: Math.max(0, item.balance - item.quantity),
  }))

  let detailsText = `Checkout: ${checkoutTotalItems} items - `

  if (enhancedItems.length <= 2) {
    detailsText += enhancedItems.map((item) => `${item.name} x${item.quantity} (${item.brand})`).join(", ")
  } else if (enhancedItems.length <= 4) {
    detailsText += enhancedItems.map((item) => `${item.name} x${item.quantity}`).join(", ")
  } else {
    const itemSummary = enhancedItems.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity
      return acc
    }, {} as Record<string, number>)

    detailsText += Object.entries(itemSummary)
      .map(([itemName, qty]) => `${itemName} x${qty}`)
      .join(", ")
  }

  if (detailsText.length > 255) {
    detailsText = `${detailsText.substring(0, 252)}...`
  }

  let itemNumbers = itemsToCheckout.map((item) => item.id).join(";")
  if (itemNumbers.length > 255) {
    const maxLength = 252
    const itemIds = itemsToCheckout.map((item) => item.id)
    const truncatedIds: string[] = []
    let currentLength = 0

    for (const id of itemIds) {
      const separatorLength = truncatedIds.length > 0 ? 1 : 0
      if (currentLength + id.length + separatorLength <= maxLength) {
        truncatedIds.push(id)
        currentLength += id.length + separatorLength
      } else {
        break
      }
    }

    itemNumbers = `${truncatedIds.join(";")}${truncatedIds.length < itemIds.length ? "..." : ""}`
  }

  const structuredItems = enhancedItems.map((item) => ({
    item_no: item.id,
    item_name: item.name,
    brand: item.brand,
    item_type: item.itemType,
    location: item.location,
    quantity: item.quantity,
    unit_of_measure: "pcs",
    balance_before: item.originalBalance,
    balance_after: item.newBalance,
  }))

  const transactionData: any = {
    username: employee.fullName,
    details: detailsText,
    id_number: employee.idNumber,
    id_barcode: employee.idBarcode,
    item_no: itemNumbers,
    items_json: JSON.stringify(structuredItems),
  }

  if (purpose && purpose.trim()) {
    transactionData.purpose = purpose.trim()
  }

  const inventoryCheckouts = itemsToCheckout.map((item) => ({
    employee_uid: employee.id,
    employee_barcode: employee.idBarcode,
    employee_name: employee.fullName,
    material_name: item.name,
    quantity_checked_out: item.quantity,
    unit_of_measure: "pcs",
    item_no: item.id,
    item_description: `${item.brand} - ${item.itemType}`,
    purpose: purpose || "Inventory checkout",
    project_name: null,
  }))

  return {
    checkoutTotalItems,
    transactionData,
    inventoryCheckouts,
  }
}
