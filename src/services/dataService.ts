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

export interface ItemsByYear {
  [year: string]: Item[]
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

export function getItems(len: number): Promise<{ items: Item[]; groupedItems: ItemsByYear }> {
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

  let items: Item[] = []
  // We will generate events in pairs.
  // Adjust pairCount so that total items is len (assuming len is even).
  const pairCount = Math.floor(len / 2)
  let idCounter = 1

  for (let i = 0; i < pairCount; i++) {
    // Generate a random year_ce between -3000 and 2100.
    const year_ce = Math.floor(Math.random() * (2100 - -3000 + 1)) + -3000
    // Convert the CE year to the Tamil Vikram year.
    const year_ta = convertToTamilVikramEra(year_ce)

    // For each pair, create two events with the same year values.
    for (let j = 0; j < 2; j++) {
      const category = categories[Math.floor(Math.random() * categories.length)]
      const index = Math.floor(Math.random() * 3) + 1
      const date = '2025-04-03'
      const english_heading = `${category.charAt(0).toUpperCase() + category.slice(1)} Item ${idCounter}`
      const tamil_heading = `தமிழ் ${category} ஐட்டம் ${idCounter}`

      const english_long_text = `This is a detailed description for ${english_heading}. It provides insights into various aspects of ${category}.`
      const tamil_long_text = `இது ${tamil_heading} பற்றிய விரிவான விளக்கம். இது ${category} உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.`

      const featured_image = `https://example.com/${category}${index}.jpg`
      const additional_images = [
        `https://example.com/${category}${index}a.jpg`,
        `https://example.com/${category}${index}b.jpg`,
      ]
      const type = Math.random() < 0.5 ? 'tamil' : 'world'

      items.push({
        id: idCounter,
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

      idCounter++
    }
  }

  // If len is odd, add one extra event.
  if (len % 2 !== 0) {
    const year_ce = Math.floor(Math.random() * (2100 - -3000 + 1)) + -3000
    const year_ta = convertToTamilVikramEra(year_ce)
    const category = categories[Math.floor(Math.random() * categories.length)]
    const index = Math.floor(Math.random() * 3) + 1
    const date = '2025-04-03'
    const english_heading = `${category.charAt(0).toUpperCase() + category.slice(1)} Item ${idCounter}`
    const tamil_heading = `தமிழ் ${category} ஐட்டம் ${idCounter}`
    const english_long_text = `This is a detailed description for ${english_heading}. It provides insights into various aspects of ${category}.`
    const tamil_long_text = `இது ${tamil_heading} பற்றிய விரிவான விளக்கம். இது ${category} உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.`
    const featured_image = `https://example.com/${category}${index}.jpg`
    const additional_images = [
      `https://example.com/${category}${index}a.jpg`,
      `https://example.com/${category}${index}b.jpg`,
    ]
    const type = Math.random() < 0.5 ? 'tamil' : 'world'

    items.push({
      id: idCounter,
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

  items = [
    {
      id: 1,
      tamil_heading: 'தமிழ் archeology ஐட்டம் 1',
      english_heading: 'Archeology Item 1',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for Archeology Item 1. It provides insights into various aspects of archeology.',
      tamil_long_text:
        'இது தமிழ் archeology ஐட்டம் 1 பற்றிய விரிவான விளக்கம். இது archeology உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/archeology2.jpg',
      additional_images: [
        'https://example.com/archeology2a.jpg',
        'https://example.com/archeology2b.jpg',
      ],
      category: 'archeology',
      index: 2,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 2,
      tamil_heading: 'தமிழ் World history ஐட்டம் 2',
      english_heading: 'World history Item 2',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for World history Item 2. It provides insights into various aspects of World history.',
      tamil_long_text:
        'இது தமிழ் World history ஐட்டம் 2 பற்றிய விரிவான விளக்கம். இது World history உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/World history3.jpg',
      additional_images: [
        'https://example.com/World history3a.jpg',
        'https://example.com/World history3b.jpg',
      ],
      category: 'World history',
      index: 3,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 3,
      tamil_heading: 'தமிழ் Laws ஐட்டம் 3',
      english_heading: 'Laws Item 3',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for Laws Item 3. It provides insights into various aspects of Laws.',
      tamil_long_text:
        'இது தமிழ் Laws ஐட்டம் 3 பற்றிய விரிவான விளக்கம். இது Laws உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Laws1.jpg',
      additional_images: ['https://example.com/Laws1a.jpg', 'https://example.com/Laws1b.jpg'],
      category: 'Laws',
      index: 1,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 4,
      tamil_heading: 'தமிழ் Rulers ஐட்டம் 4',
      english_heading: 'Rulers Item 4',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for Rulers Item 4. It provides insights into various aspects of Rulers.',
      tamil_long_text:
        'இது தமிழ் Rulers ஐட்டம் 4 பற்றிய விரிவான விளக்கம். இது Rulers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Rulers2.jpg',
      additional_images: ['https://example.com/Rulers2a.jpg', 'https://example.com/Rulers2b.jpg'],
      category: 'Rulers',
      index: 2,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 5,
      tamil_heading: 'தமிழ் Literature ஐட்டம் 5',
      english_heading: 'Literature Item 5',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for Literature Item 5. It provides insights into various aspects of Literature.',
      tamil_long_text:
        'இது தமிழ் Literature ஐட்டம் 5 பற்றிய விரிவான விளக்கம். இது Literature உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Literature3.jpg',
      additional_images: [
        'https://example.com/Literature3a.jpg',
        'https://example.com/Literature3b.jpg',
      ],
      category: 'Literature',
      index: 3,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 6,
      tamil_heading: 'தமிழ் Achievers ஐட்டம் 6',
      english_heading: 'Achievers Item 6',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for Achievers Item 6. It provides insights into various aspects of Achievers.',
      tamil_long_text:
        'இது தமிழ் Achievers ஐட்டம் 6 பற்றிய விரிவான விளக்கம். இது Achievers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Achievers1.jpg',
      additional_images: [
        'https://example.com/Achievers1a.jpg',
        'https://example.com/Achievers1b.jpg',
      ],
      category: 'Achievers',
      index: 1,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 7,
      tamil_heading: 'தமிழ் Awardee ஐட்டம் 7',
      english_heading: 'Awardee Item 7',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for Awardee Item 7. It provides insights into various aspects of Awardee.',
      tamil_long_text:
        'இது தமிழ் Awardee ஐட்டம் 7 பற்றிய விரிவான விளக்கம். இது Awardee உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Awardee2.jpg',
      additional_images: ['https://example.com/Awardee2a.jpg', 'https://example.com/Awardee2b.jpg'],
      category: 'Awardee',
      index: 2,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 8,
      tamil_heading: 'தமிழ் Performance data ஐட்டம் 8',
      english_heading: 'Performance data Item 8',
      year_ce: 100,
      year_ta: 3212,
      english_long_text:
        'This is a detailed description for Performance data Item 8. It provides insights into various aspects of Performance data.',
      tamil_long_text:
        'இது தமிழ் Performance data ஐட்டம் 8 பற்றிய விரிவான விளக்கம். இது Performance data உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Performance data3.jpg',
      additional_images: [
        'https://example.com/Performance data3a.jpg',
        'https://example.com/Performance data3b.jpg',
      ],
      category: 'Performance data',
      index: 3,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 9,
      tamil_heading: 'தமிழ் archeology ஐட்டம் 9',
      english_heading: 'Archeology Item 9',
      year_ce: 500,
      year_ta: 3612,
      english_long_text:
        'This is a detailed description for Archeology Item 9. It provides insights into various aspects of archeology.',
      tamil_long_text:
        'இது தமிழ் archeology ஐட்டம் 9 பற்றிய விரிவான விளக்கம். இது archeology உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/archeology1.jpg',
      additional_images: [
        'https://example.com/archeology1a.jpg',
        'https://example.com/archeology1b.jpg',
      ],
      category: 'archeology',
      index: 1,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 10,
      tamil_heading: 'தமிழ் World history ஐட்டம் 10',
      english_heading: 'World history Item 10',
      year_ce: 500,
      year_ta: 3612,
      english_long_text:
        'This is a detailed description for World history Item 10. It provides insights into various aspects of World history.',
      tamil_long_text:
        'இது தமிழ் World history ஐட்டம் 10 பற்றிய விரிவான விளக்கம். இது World history உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/World history2.jpg',
      additional_images: [
        'https://example.com/World history2a.jpg',
        'https://example.com/World history2b.jpg',
      ],
      category: 'World history',
      index: 2,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 11,
      tamil_heading: 'தமிழ் Laws ஐட்டம் 11',
      english_heading: 'Laws Item 11',
      year_ce: 500,
      year_ta: 3612,
      english_long_text:
        'This is a detailed description for Laws Item 11. It provides insights into various aspects of Laws.',
      tamil_long_text:
        'இது தமிழ் Laws ஐட்டம் 11 பற்றிய விரிவான விளக்கம். இது Laws உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Laws3.jpg',
      additional_images: ['https://example.com/Laws3a.jpg', 'https://example.com/Laws3b.jpg'],
      category: 'Laws',
      index: 3,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 12,
      tamil_heading: 'தமிழ் Rulers ஐட்டம் 12',
      english_heading: 'Rulers Item 12',
      year_ce: 500,
      year_ta: 3612,
      english_long_text:
        'This is a detailed description for Rulers Item 12. It provides insights into various aspects of Rulers.',
      tamil_long_text:
        'இது தமிழ் Rulers ஐட்டம் 12 பற்றிய விரிவான விளக்கம். இது Rulers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Rulers1.jpg',
      additional_images: ['https://example.com/Rulers1a.jpg', 'https://example.com/Rulers1b.jpg'],
      category: 'Rulers',
      index: 1,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 13,
      tamil_heading: 'தமிழ் Literature ஐட்டம் 13',
      english_heading: 'Literature Item 13',
      year_ce: 500,
      year_ta: 3612,
      english_long_text:
        'This is a detailed description for Literature Item 13. It provides insights into various aspects of Literature.',
      tamil_long_text:
        'இது தமிழ் Literature ஐட்டம் 13 பற்றிய விரிவான விளக்கம். இது Literature உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Literature2.jpg',
      additional_images: [
        'https://example.com/Literature2a.jpg',
        'https://example.com/Literature2b.jpg',
      ],
      category: 'Literature',
      index: 2,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 14,
      tamil_heading: 'தமிழ் Achievers ஐட்டம் 14',
      english_heading: 'Achievers Item 14',
      year_ce: 500,
      year_ta: 3612,
      english_long_text:
        'This is a detailed description for Achievers Item 14. It provides insights into various aspects of Achievers.',
      tamil_long_text:
        'இது தமிழ் Achievers ஐட்டம் 14 பற்றிய விரிவான விளக்கம். இது Achievers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Achievers3.jpg',
      additional_images: [
        'https://example.com/Achievers3a.jpg',
        'https://example.com/Achievers3b.jpg',
      ],
      category: 'Achievers',
      index: 3,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 15,
      tamil_heading: 'தமிழ் Awardee ஐட்டம் 15',
      english_heading: 'Awardee Item 15',
      year_ce: 1500,
      year_ta: 4612,
      english_long_text:
        'This is a detailed description for Awardee Item 15. It provides insights into various aspects of Awardee.',
      tamil_long_text:
        'இது தமிழ் Awardee ஐட்டம் 15 பற்றிய விரிவான விளக்கம். இது Awardee உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Awardee1.jpg',
      additional_images: ['https://example.com/Awardee1a.jpg', 'https://example.com/Awardee1b.jpg'],
      category: 'Awardee',
      index: 1,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 16,
      tamil_heading: 'தமிழ் Performance data ஐட்டம் 16',
      english_heading: 'Performance data Item 16',
      year_ce: 1500,
      year_ta: 4612,
      english_long_text:
        'This is a detailed description for Performance data Item 16. It provides insights into various aspects of Performance data.',
      tamil_long_text:
        'இது தமிழ் Performance data ஐட்டம் 16 பற்றிய விரிவான விளக்கம். இது Performance data உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Performance data2.jpg',
      additional_images: [
        'https://example.com/Performance data2a.jpg',
        'https://example.com/Performance data2b.jpg',
      ],
      category: 'Performance data',
      index: 2,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 17,
      tamil_heading: 'தமிழ் archeology ஐட்டம் 17',
      english_heading: 'Archeology Item 17',
      year_ce: -2500,
      year_ta: 613,
      english_long_text:
        'This is a detailed description for Archeology Item 17. It provides insights into various aspects of archeology.',
      tamil_long_text:
        'இது தமிழ் archeology ஐட்டம் 17 பற்றிய விரிவான விளக்கம். இது archeology உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/archeology2.jpg',
      additional_images: [
        'https://example.com/archeology2a.jpg',
        'https://example.com/archeology2b.jpg',
      ],
      category: 'archeology',
      index: 2,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 18,
      tamil_heading: 'தமிழ் World history ஐட்டம் 18',
      english_heading: 'World history Item 18',
      year_ce: -2400,
      year_ta: 713,
      english_long_text:
        'This is a detailed description for World history Item 18. It provides insights into various aspects of World history.',
      tamil_long_text:
        'இது தமிழ் World history ஐட்டம் 18 பற்றிய விரிவான விளக்கம். இது World history உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/World history3.jpg',
      additional_images: [
        'https://example.com/World history3a.jpg',
        'https://example.com/World history3b.jpg',
      ],
      category: 'World history',
      index: 3,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 19,
      tamil_heading: 'தமிழ் Laws ஐட்டம் 19',
      english_heading: 'Laws Item 19',
      year_ce: -2300,
      year_ta: 813,
      english_long_text:
        'This is a detailed description for Laws Item 19. It provides insights into various aspects of Laws.',
      tamil_long_text:
        'இது தமிழ் Laws ஐட்டம் 19 பற்றிய விரிவான விளக்கம். இது Laws உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Laws1.jpg',
      additional_images: ['https://example.com/Laws1a.jpg', 'https://example.com/Laws1b.jpg'],
      category: 'Laws',
      index: 1,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 20,
      tamil_heading: 'தமிழ் Rulers ஐட்டம் 20',
      english_heading: 'Rulers Item 20',
      year_ce: -2200,
      year_ta: 913,
      english_long_text:
        'This is a detailed description for Rulers Item 20. It provides insights into various aspects of Rulers.',
      tamil_long_text:
        'இது தமிழ் Rulers ஐட்டம் 20 பற்றிய விரிவான விளக்கம். இது Rulers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Rulers2.jpg',
      additional_images: ['https://example.com/Rulers2a.jpg', 'https://example.com/Rulers2b.jpg'],
      category: 'Rulers',
      index: 2,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 21,
      tamil_heading: 'தமிழ் Literature ஐட்டம் 21',
      english_heading: 'Literature Item 21',
      year_ce: -2100,
      year_ta: 1013,
      english_long_text:
        'This is a detailed description for Literature Item 21. It provides insights into various aspects of Literature.',
      tamil_long_text:
        'இது தமிழ் Literature ஐட்டம் 21 பற்றிய விரிவான விளக்கம். இது Literature உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Literature3.jpg',
      additional_images: [
        'https://example.com/Literature3a.jpg',
        'https://example.com/Literature3b.jpg',
      ],
      category: 'Literature',
      index: 3,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 22,
      tamil_heading: 'தமிழ் Achievers ஐட்டம் 22',
      english_heading: 'Achievers Item 22',
      year_ce: -2000,
      year_ta: 1113,
      english_long_text:
        'This is a detailed description for Achievers Item 22. It provides insights into various aspects of Achievers.',
      tamil_long_text:
        'இது தமிழ் Achievers ஐட்டம் 22 பற்றிய விரிவான விளக்கம். இது Achievers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Achievers1.jpg',
      additional_images: [
        'https://example.com/Achievers1a.jpg',
        'https://example.com/Achievers1b.jpg',
      ],
      category: 'Achievers',
      index: 1,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 23,
      tamil_heading: 'தமிழ் Awardee ஐட்டம் 23',
      english_heading: 'Awardee Item 23',
      year_ce: -1900,
      year_ta: 1213,
      english_long_text:
        'This is a detailed description for Awardee Item 23. It provides insights into various aspects of Awardee.',
      tamil_long_text:
        'இது தமிழ் Awardee ஐட்டம் 23 பற்றிய விரிவான விளக்கம். இது Awardee உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Awardee2.jpg',
      additional_images: ['https://example.com/Awardee2a.jpg', 'https://example.com/Awardee2b.jpg'],
      category: 'Awardee',
      index: 2,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 24,
      tamil_heading: 'தமிழ் Performance data ஐட்டம் 24',
      english_heading: 'Performance data Item 24',
      year_ce: -1800,
      year_ta: 1313,
      english_long_text:
        'This is a detailed description for Performance data Item 24. It provides insights into various aspects of Performance data.',
      tamil_long_text:
        'இது தமிழ் Performance data ஐட்டம் 24 பற்றிய விரிவான விளக்கம். இது Performance data உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Performance data1.jpg',
      additional_images: [
        'https://example.com/Performance data1a.jpg',
        'https://example.com/Performance data1b.jpg',
      ],
      category: 'Performance data',
      index: 1,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 25,
      tamil_heading: 'தமிழ் archeology ஐட்டம் 25',
      english_heading: 'Archeology Item 25',
      year_ce: -1700,
      year_ta: 1413,
      english_long_text:
        'This is a detailed description for Archeology Item 25. It provides insights into various aspects of archeology.',
      tamil_long_text:
        'இது தமிழ் archeology ஐட்டம் 25 பற்றிய விரிவான விளக்கம். இது archeology உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/archeology3.jpg',
      additional_images: [
        'https://example.com/archeology3a.jpg',
        'https://example.com/archeology3b.jpg',
      ],
      category: 'archeology',
      index: 2,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 26,
      tamil_heading: 'தமிழ் World history ஐட்டம் 26',
      english_heading: 'World history Item 26',
      year_ce: -1600,
      year_ta: 1513,
      english_long_text:
        'This is a detailed description for World history Item 26. It provides insights into various aspects of World history.',
      tamil_long_text:
        'இது தமிழ் World history ஐட்டம் 26 பற்றிய விரிவான விளக்கம். இது World history உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/World history1.jpg',
      additional_images: [
        'https://example.com/World history1a.jpg',
        'https://example.com/World history1b.jpg',
      ],
      category: 'World history',
      index: 1,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 27,
      tamil_heading: 'தமிழ் Laws ஐட்டம் 27',
      english_heading: 'Laws Item 27',
      year_ce: -1500,
      year_ta: 1613,
      english_long_text:
        'This is a detailed description for Laws Item 27. It provides insights into various aspects of Laws.',
      tamil_long_text:
        'இது தமிழ் Laws ஐட்டம் 27 பற்றிய விரிவான விளக்கம். இது Laws உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Laws2.jpg',
      additional_images: ['https://example.com/Laws2a.jpg', 'https://example.com/Laws2b.jpg'],
      category: 'Laws',
      index: 2,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 28,
      tamil_heading: 'தமிழ் Rulers ஐட்டம் 28',
      english_heading: 'Rulers Item 28',
      year_ce: -1400,
      year_ta: 1713,
      english_long_text:
        'This is a detailed description for Rulers Item 28. It provides insights into various aspects of Rulers.',
      tamil_long_text:
        'இது தமிழ் Rulers ஐட்டம் 28 பற்றிய விரிவான விளக்கம். இது Rulers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Rulers3.jpg',
      additional_images: ['https://example.com/Rulers3a.jpg', 'https://example.com/Rulers3b.jpg'],
      category: 'Rulers',
      index: 3,
      date: '2025-04-03',
      type: 'world',
    },
    {
      id: 29,
      tamil_heading: 'தமிழ் Literature ஐட்டம் 29',
      english_heading: 'Literature Item 29',
      year_ce: -1300,
      year_ta: 1813,
      english_long_text:
        'This is a detailed description for Literature Item 29. It provides insights into various aspects of Literature.',
      tamil_long_text:
        'இது தமிழ் Literature ஐட்டம் 29 பற்றிய விரிவான விளக்கம். இது Literature உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Literature1.jpg',
      additional_images: [
        'https://example.com/Literature1a.jpg',
        'https://example.com/Literature1b.jpg',
      ],
      category: 'Literature',
      index: 1,
      date: '2025-04-03',
      type: 'tamil',
    },
    {
      id: 30,
      tamil_heading: 'தமிழ் Achievers ஐட்டம் 30',
      english_heading: 'Achievers Item 30',
      year_ce: -1200,
      year_ta: 1913,
      english_long_text:
        'This is a detailed description for Achievers Item 30. It provides insights into various aspects of Achievers.',
      tamil_long_text:
        'இது தமிழ் Achievers ஐட்டம் 30 பற்றிய விரிவான விளக்கம். இது Achievers உடைய பல அம்சங்களை வெளிப்படுத்துகிறது.',
      featured_image: 'https://example.com/Achievers2.jpg',
      additional_images: [
        'https://example.com/Achievers2a.jpg',
        'https://example.com/Achievers2b.jpg',
      ],
      category: 'Achievers',
      index: 2,
      date: '2025-04-03',
      type: 'world',
    },
  ]

  function restructureItemsByYear(items: Item[]): ItemsByYear {
    return items.reduce((acc: ItemsByYear, item: Item) => {
      if (!acc[item.year_ce]) {
        acc[item.year_ce] = []
      }
      acc[item.year_ce].push(item)
      return acc
    }, {} as ItemsByYear)
  }

  const itemsByYear = restructureItemsByYear(items)

  return Promise.resolve({ items, groupedItems: itemsByYear })
}
