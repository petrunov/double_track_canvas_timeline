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
  type: string
}

// Helper conversion function using the Tamil Vikram era.
// The Tamil Vikram era is defined such that 3112 BCE is year 1.
// For CE years (year >= 1), we use: Tamil Year = CE Year + 3112.
// For BCE years (year < 1), we use: Tamil Year = 3113 + CE Year.
function convertToTamilVikramEra(yearCE: number): number {
  if (yearCE >= 1) {
    return yearCE + 3112
  } else {
    // For BCE years: For example, if yearCE = -3112 then Tamil year = 3113 + (-3112) = 1.
    return 3113 + yearCE
  }
}

export function getItems(len: number): Promise<Item[]> {
  const categories = [
    'archeology',
    'World history',
    'Laws',
    'Rulers',
    'Literature',
    'Achievers',
    'Awardee',
    'Performance data',
  ]

  const items: Item[] = []

  for (let i = 0; i < len; i++) {
    const id = i + 1 // Unique ID for each item.
    // Randomly generate a year_ce between -5000 (5000 BCE) and 2100 (2100 AD).
    const year_ce = Math.floor(Math.random() * (2100 - -3000 + 1)) + -3000
    // Convert the CE year to the Tamil Vikram year.
    const year_ta = convertToTamilVikramEra(year_ce)

    // Randomly select a category.
    const category = categories[Math.floor(Math.random() * categories.length)]

    // Random index between 1 and 3.
    const index = Math.floor(Math.random() * 3) + 1

    // Use a static date for all items (or generate dynamically if needed).
    const date = '2025-04-03'

    // Create headings and texts incorporating the category and item number.
    const english_heading = `${category.charAt(0).toUpperCase() + category.slice(1)} Item ${i + 1}`
    const tamil_heading = `தமிழ் ${category} ஐட்டம் ${i + 1}`

    const english_long_text = `This is a detailed description for ${english_heading}. It provides insights into various aspects of ${category}.`
    const tamil_long_text = `இது ${tamil_heading} பற்றிய விரிவான விளக்கம். இது ${category} உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.`

    // Generate featured image and additional images using the category and index.
    const featured_image = `https://example.com/${category}${index}.jpg`
    const additional_images = [
      `https://example.com/${category}${index}a.jpg`,
      `https://example.com/${category}${index}b.jpg`,
    ]

    // Randomly assign type to be 'tamil' or 'world'
    const type = Math.random() < 0.5 ? 'tamil' : 'world'

    items.push({
      id,
      tamil_heading,
      english_heading,
      year_ce,
      year_ta,
      english_long_text,
      tamil_long_text,
      featured_image,
      additional_images,
      category,
      index,
      date,
      type,
    })
  }

  // Sort items by ascending order of year_ce.
  items.sort((a, b) => a.year_ce - b.year_ce)

  return Promise.resolve(items)
}
