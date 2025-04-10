// types.ts
export interface Item {
  id: number
  tamil_heading: string
  english_heading: string
  year_ce: number
  year_ta: number
  english_long_text: string
  tamil_long_text: string
  featured_image: string
  additional_images: string[]
  category: string
  index: number
  date: string
}

export interface ItemsByYear {
  [year: string]: Item[]
}

// utils.ts
// The Tamil Vikram era conversion function.
// For CE years (year >= 1): Tamil Year = CE Year + 3112.
// For BCE years (year < 1): Tamil Year = 3113 + CE Year.
export function convertToTamilVikramEra(yearCE: number): number {
  return yearCE >= 1 ? yearCE + 3112 : 3113 + yearCE
}

export function restructureItemsByYear(items: Item[]): ItemsByYear {
  return items.reduce((acc: ItemsByYear, item: Item) => {
    if (!acc[item.year_ce]) {
      acc[item.year_ce] = []
    }
    acc[item.year_ce].push(item)
    return acc
  }, {} as ItemsByYear)
}

// In the future these functions would use fetch calls to your BE endpoints.
// For now, they import local JSON files.
async function getEventsData(): Promise<unknown> {
  // Simulate a call to a BE endpoint for events.
  // Replace with: return fetch('<events-endpoint>').then(r => r.json())
  return import('/src/assets/events.json')
}

async function getCategoriesData(): Promise<unknown> {
  // Simulate a call to a BE endpoint for categories.
  // Replace with: return fetch('<categories-endpoint>').then(r => r.json())
  return import('/src/assets/categories.json')
}

/**
 * getItems loads the events and categories,
 * normalizes the events data so that:
 *   - the category becomes just the category name;
 *   - if the event’s category is null, it defaults to "World History".
 * Then the items are sorted by ascending CE year and grouped by year.
 */
export async function getItems(): Promise<{ items: Item[]; groupedItems: ItemsByYear }> {
  // Load the raw data (simulate BE endpoints)
  const eventsResponse = await getEventsData()
  const categoriesResponse = await getCategoriesData()

  // Both endpoints are expected to have a "data" property.
  const rawEvents: unknown[] = eventsResponse.data
  const rawCategories: unknown[] = categoriesResponse.data

  // Build a quick lookup for categories by id.
  const categoryLookup: { [id: number]: string } = {}
  rawCategories.forEach((cat) => {
    // Assuming each category object has an "id" and a "name"
    categoryLookup[cat.id] = cat.name
  })

  // Normalize each event from the BE to our internal Item format.
  const items: Item[] = rawEvents.map((event) => {
    // Use "Year_CE_Int" for the CE year.
    const year_ce: number = event.Year_CE_Int

    // Compute the Tamil Vikram year using our helper.
    const year_ta: number = convertToTamilVikramEra(year_ce)

    // Determine the category name.
    // If the event includes a Category with a "key", look it up.
    // Otherwise, use "World History" as default.
    let categoryName: string = 'World History'
    if (event.Category && event.Category.key) {
      // If a matching category is found, use its name.
      categoryName = categoryLookup[event.Category.key] || categoryName
    }

    return {
      id: event.id,
      tamil_heading: event.Heading_Tamil || '', // fallback to empty string if null
      english_heading: event.Heading_English || '',
      year_ce,
      year_ta,
      english_long_text: event.DetailedText_English || '',
      tamil_long_text: event.DetailedText_Tamil || '',
      featured_image: event.FeaturedImage || '',
      additional_images: event.AdditionalImages || [],
      category: categoryName,
      // "Index" in the BE data might be a string; convert it to a number.
      index: Number(event.Index),
      // Use event.Date if provided; otherwise default to an empty string.
      date: event.Date || '',
      // For "type" we use the provided Year_CE_Type field (converted to string)
      // or default to "world"
      type: event.Year_CE_Type ? event.Year_CE_Type.toString() : 'world',
    }
  })

  // Sort items by ascending CE year.
  items.sort((a, b) => a.year_ce - b.year_ce)

  // Group the items by year using the provided helper.
  const groupedItems = restructureItemsByYear(items)

  console.log('groupedItems', groupedItems)

  return Promise.resolve({ items, groupedItems })
}
