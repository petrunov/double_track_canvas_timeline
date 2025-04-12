// dataService.ts

// --- Interfaces ---

export interface Category {
  key: number
  collection: string
}

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
  category: string // normalized category name
  index: number
  date: string
}

export interface GroupColumn {
  groupIndex: number
  tamil: Item[]
  world: Item[]
}

export interface YearGroup {
  year: number
  groups: GroupColumn[]
}

/**
 * Old helper: Groups items by year into a record.
 */
export interface ItemsByYear {
  [year: string]: Item[]
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

// --- Raw Data Interfaces ---

interface RawEvent {
  id: number
  Heading_Tamil: string
  Heading_English: string
  Year_TA: string
  DetailedText_Tamil: string
  DetailedText_English: string
  FeaturedImage: string
  Index: string
  Date: string | null
  Year_CE_Type: string
  Year_CE_Int: number
  Category: Category | null
  AdditionalImages: string[]
}

interface RawCategory {
  id: number
  name: string
}

// --- Utility Functions ---

/**
 * Converts a CE year to the Tamil Vikram Era.
 * For CE years (year >= 1): Tamil Year = CE Year + 3112.
 * For BCE years (year < 1): Tamil Year = 3113 + CE Year.
 */
export function convertToTamilVikramEra(yearCE: number): number {
  return yearCE >= 1 ? yearCE + 3112 : 3113 + yearCE
}

/**
 * Determines the track for an item based on its normalized category.
 * If the category is "World History" (or is missing), it returns "world";
 * otherwise, it returns "tamil".
 */
function getItemTrack(item: Item): 'tamil' | 'world' {
  if (!item.category || item.category === 'World History') {
    return 'world'
  }
  return 'tamil'
}

/**
 * Groups items by their year (using year_ce) and then by track.
 * For each year, items in each track are split into chunks (columns) of up to 4 items.
 * Both the tamil and world tracks are aligned by ensuring that each YearGroup has the same
 * number of groups (filling missing groups with empty arrays).
 *
 * @param items - The array of normalized items.
 * @returns An array of YearGroup objects.
 */
export function restructureItemsGroupedByYearAndTrack(items: Item[]): YearGroup[] {
  const yearMap: Record<string, { tamil: Item[]; world: Item[] }> = {}

  items.forEach((item) => {
    const yearKey = String(item.year_ce)
    if (!yearMap[yearKey]) {
      yearMap[yearKey] = { tamil: [], world: [] }
    }
    if (getItemTrack(item) === 'world') {
      yearMap[yearKey].world.push(item)
    } else {
      yearMap[yearKey].tamil.push(item)
    }
  })

  const chunkArray = (arr: Item[]): Item[][] => {
    const chunks: Item[][] = []
    for (let i = 0; i < arr.length; i += 4) {
      chunks.push(arr.slice(i, i + 4))
    }
    return chunks
  }

  const yearGroups: YearGroup[] = []
  Object.keys(yearMap)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((yearKey) => {
      const year = Number(yearKey)
      const tamilItems = yearMap[yearKey].tamil
      const worldItems = yearMap[yearKey].world

      const tamilGroups = chunkArray(tamilItems)
      const worldGroups = chunkArray(worldItems)
      const maxGroupCount = Math.max(tamilGroups.length, worldGroups.length, 1)

      const groups: GroupColumn[] = []
      for (let i = 0; i < maxGroupCount; i++) {
        groups.push({
          groupIndex: i,
          tamil: tamilGroups[i] || [],
          world: worldGroups[i] || [],
        })
      }
      yearGroups.push({ year, groups })
    })

  return yearGroups
}

// --- Data Loading Functions ---

// Define the expected type for the events JSON.
interface EventsResponse {
  data: RawEvent[]
}

// Define the expected type for the categories JSON.
interface CategoriesResponse {
  data: RawCategory[]
}

/**
 * Simulates a backend call to fetch events data.
 * Replace this with an actual fetch call for production.
 */
async function getEventsData(): Promise<EventsResponse> {
  return import('../assets/events.json') as Promise<EventsResponse>
}

/**
 * Simulates a backend call to fetch categories data.
 * Replace this with an actual fetch call for production.
 */
async function getCategoriesData(): Promise<CategoriesResponse> {
  return import('../assets/categories.json') as Promise<CategoriesResponse>
}

/**
 * Loads events and categories data, normalizes the events by:
 *   - Converting the CE year to the Tamil Vikram Era.
 *   - Normalizing the category: if the event’s Category exists and has a key, use the
 *     categoryLookup to get its name; if not, default to "World History".
 * All original properties are retained, and the items are sorted by ascending CE year.
 * Finally, the items are grouped by year using restructureItemsGroupedByYearAndTrack.
 *
 * @returns A promise resolving with an object containing the normalized items and groupedItems.
 */
export async function getItems(): Promise<{ items: Item[]; groupedItems: YearGroup[] }> {
  const eventsResponse = await getEventsData()
  const categoriesResponse = await getCategoriesData()

  const rawEvents = eventsResponse.data
  const rawCategories = categoriesResponse.data

  // Build a lookup for category names by id.
  const categoryLookup: { [id: number]: string } = {}
  rawCategories.forEach((cat) => {
    categoryLookup[cat.id] = cat.name
  })

  // Normalize each event into our internal Item format.
  const items: Item[] = rawEvents.map((event) => {
    const year_ce = event.Year_CE_Int
    const year_ta = convertToTamilVikramEra(year_ce)
    let categoryName = 'World History'
    if (event.Category && event.Category.key) {
      categoryName = categoryLookup[event.Category.key] || 'World History'
    }
    return {
      id: event.id,
      tamil_heading: event.Heading_Tamil || '',
      english_heading: event.Heading_English || '',
      year_ce,
      year_ta,
      english_long_text: event.DetailedText_English || '',
      tamil_long_text: event.DetailedText_Tamil || '',
      featured_image: event.FeaturedImage || '',
      additional_images: event.AdditionalImages || [],
      category: categoryName,
      index: Number(event.Index),
      date: event.Date || '',
    }
  })

  const startingId = items[items.length - 1].id + 1

  function getRandomYear(): number {
    return Math.floor(Math.random() * (2025 - -3000 + 1)) - 3000
  }

  function getRandomCategory(): string {
    const categories = []
    categories[1] = 'World History'
    categories[2] = 'Literature'
    categories[3] = 'Archeology'
    categories[4] = 'Rulers'
    categories[5] = 'Achievers'
    categories[6] = 'Awardee'
    categories[7] = 'Laws'

    return categories[Math.floor(Math.random() * 7) + 1]
  }

  for (let i = 0; i < 500; i++) {
    const randomYear = getRandomYear()
    const randomCategory = getRandomCategory()

    const newItem: Item = {
      id: startingId + i,
      tamil_heading: `Random Tamil Heading ${i + 1}`,
      english_heading: `Random English Heading ${i + 1}`,
      year_ce: randomYear,
      year_ta: convertToTamilVikramEra(randomYear),
      english_long_text: `This is a randomly generated English description for item ${i + 1}`,
      tamil_long_text: `This is a randomly generated Tamil description for item ${i + 1}`,
      featured_image: `random-featured-image-${i}.jpg`,
      additional_images: [],
      category: `${randomCategory}`,
      index: i,
      date: `2000-01-${String((i % 31) + 1).padStart(2, '0')}`,
    }

    items.push(newItem)
  }

  // Sort items by ascending CE year.
  items.sort((a, b) => a.year_ce - b.year_ce)

  // Group the items using our new restructuring function.
  const groupedItems = restructureItemsGroupedByYearAndTrack(items)
  return Promise.resolve({ items, groupedItems })
}
