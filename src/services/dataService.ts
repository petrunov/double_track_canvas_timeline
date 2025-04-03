export interface Item {
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

export function getItems(): Promise<Item[]> {
  const items: Item[] = [
    {
      tamil_heading: 'புராண பூதக்காட்சிகள்: தொல்லியல் தடயங்கள்',
      english_heading: 'Unearthing Ancient Artifacts',
      year_ce: 250,
      year_ta: -50,
      english_long_text: 'Documenting the discovery of artifacts that reveal ancient lifestyles.',
      tamil_long_text: 'பழமையான வாழ்கைகளை வெளிப்படுத்தும் கலைகளின் கண்டுபிடிப்புகளைக் குறிப்பது.',
      featured_image: 'https://example.com/archeology2.jpg',
      additional_images: [
        'https://example.com/archeology2a.jpg',
        'https://example.com/archeology2b.jpg',
      ],
      category: 'archeology',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'புராண சுவடுகள்: தொலைந்த காலத்தின் அடையாளங்கள்',
      english_heading: 'Archeological Discoveries: Traces of the Lost Era',
      year_ce: 300,
      year_ta: 0,
      english_long_text:
        'A comprehensive report on recent archeological finds that shed light on ancient lifestyles.',
      tamil_long_text:
        'பழமையான வாழ்கைகளை வெளிப்படுத்தும் சமீபத்திய புதையல் கண்டுபிடிப்புகளின் விரிவான அறிக்கை.',
      featured_image: 'https://example.com/archeology1.jpg',
      additional_images: ['https://example.com/archeology1a.jpg'],
      category: 'archeology',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'பழமையான இடங்கள்: மறக்கப்பட்ட நகரங்கள்',
      english_heading: 'Lost Cities Unearthed',
      year_ce: 400,
      year_ta: 100,
      english_long_text:
        'Discoveries of lost cities that provide insights into ancient urban planning.',
      tamil_long_text:
        'பழமையான நகரங்களின் கண்டுபிடிப்புகள் மற்றும் அவற்றின் நகர திட்டமிடலை விளக்குகிறது.',
      featured_image: 'https://example.com/archeology3.jpg',
      additional_images: ['https://example.com/archeology3a.jpg'],
      category: 'archeology',
      index: 3,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'உலக வரலாறு: பண்டைய நாகரிகம்',
      english_heading: 'Ancient Civilization in World History',
      year_ce: 500,
      year_ta: 200,
      english_long_text:
        'This detailed account explores ancient civilizations and their impact on modern society.',
      tamil_long_text:
        'இந்த விரிவான விளக்கம் பழமையான நாகரிகங்கள் மற்றும் அவற்றின் நவீன சமூகத்தில் ஏற்பட்ட தாக்கத்தை ஆராய்கிறது.',
      featured_image: 'https://example.com/worldhistory1.jpg',
      additional_images: [
        'https://example.com/worldhistory1a.jpg',
        'https://example.com/worldhistory1b.jpg',
      ],
      category: 'World history',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'சட்ட வரலாறு: நீதியின் வழிகாட்டிகள்',
      english_heading: 'Evolution of Legal Systems',
      year_ce: 600,
      year_ta: 300,
      english_long_text: 'Tracing the development of legal frameworks that govern societies.',
      tamil_long_text:
        'சமூகங்களை ஆணைக்கும் சட்ட அமைப்புகளின் வளர்ச்சியை பதிவு செய்யும் பதிவின் ஆராய்ச்சி.',
      featured_image: 'https://example.com/laws2.jpg',
      additional_images: ['https://example.com/laws2a.jpg', 'https://example.com/laws2b.jpg'],
      category: 'Laws',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'சட்டங்கள்: நியாயத்தின் அடித்தளம்',
      english_heading: 'Historic Legal Frameworks',
      year_ce: 800,
      year_ta: 500,
      english_long_text:
        'An overview of ancient laws that shaped the societal norms of their time.',
      tamil_long_text:
        'அந்த கால சமூகத்தின் விதிகளை அமைத்த பழமையான சட்டங்களை பற்றி ஒரு முழுமையான பார்வை.',
      featured_image: 'https://example.com/laws1.jpg',
      additional_images: ['https://example.com/laws1a.jpg'],
      category: 'Laws',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'அரசர்கள்: வீர வீரர்கள்',
      english_heading: 'Legendary Kings and Queens',
      year_ce: 900,
      year_ta: 600,
      english_long_text:
        'A look into the lives of legendary monarchs who led their nations to glory.',
      tamil_long_text:
        'அரசியல் சாதனை கொண்ட, தங்கள் நாட்டை பெருமைக்குக் கொண்டு செல்லும் மன்னர்கள் பற்றிய பதிவு.',
      featured_image: 'https://example.com/rulers2.jpg',
      additional_images: ['https://example.com/rulers2a.jpg'],
      category: 'Rulers',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'அரசர்கள்: வரலாற்றின் மன்னர்கள்',
      english_heading: 'Famous Rulers of the Past',
      year_ce: 1000,
      year_ta: 700,
      english_long_text: 'This entry chronicles the lives and legacies of prominent rulers.',
      tamil_long_text:
        'பிரபல அரசர்களின் வாழ்க்கையும், அவர்களின் வாரிசுகளும் பற்றி இந்த பதிவில் குறிப்பிடப்பட்டுள்ளது.',
      featured_image: 'https://example.com/rulers1.jpg',
      additional_images: ['https://example.com/rulers1a.jpg', 'https://example.com/rulers1b.jpg'],
      category: 'Rulers',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'ச文学 வரலாறு: தமிழின் மகிமை',
      english_heading: 'The Glory of Tamil Literature',
      year_ce: 1200,
      year_ta: 900,
      english_long_text:
        'An in-depth analysis of classical Tamil literature and its timeless works.',
      tamil_long_text:
        'காலந்தெழுந்த தமிழ் இலக்கியத்தின் சிறப்பையும் அதன் நிலையான படைப்புகளையும் ஆராயும் ஆழமான ஆய்வு.',
      featured_image: 'https://example.com/literature1.jpg',
      additional_images: [
        'https://example.com/literature1a.jpg',
        'https://example.com/literature1b.jpg',
      ],
      category: 'Literature',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'உலக வரலாறு: மத்திய கால நாகரிகங்கள்',
      english_heading: 'Medieval Global Empires',
      year_ce: 1300,
      year_ta: 1000,
      english_long_text:
        'Examining the rise and fall of global empires during the medieval period.',
      tamil_long_text: 'மத்தியகாலத்தில் உருவான மற்றும் வீழ்ந்த உலக பேரரசுகளை ஆய்வு செய்யும் பதிவு.',
      featured_image: 'https://example.com/worldhistory2.jpg',
      additional_images: ['https://example.com/worldhistory2a.jpg'],
      category: 'World history',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'இனிய இலக்கியம்: கவிதைகள் மற்றும் கதைப்பாடல்கள்',
      english_heading: 'Classic Poetry and Prose',
      year_ce: 1400,
      year_ta: 1100,
      english_long_text:
        'An exploration of timeless poetry and prose that has influenced generations.',
      tamil_long_text: 'பல தலைமுறைகளை உந்துவித்த அழிமான கவிதைகள் மற்றும் கதைப்பாடல்களின் ஆய்வு.',
      featured_image: 'https://example.com/literature2.jpg',
      additional_images: ['https://example.com/literature2a.jpg'],
      category: 'Literature',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'கதைகளின் கவிதை: மரபு மற்றும் மாறுதல்',
      english_heading: 'Evolving Narratives in Literature',
      year_ce: 1600,
      year_ta: 1300,
      english_long_text:
        'Discussing how traditional narratives have evolved over time in literature.',
      tamil_long_text:
        'இயற்கையான கதைகளை எழுத்து முறை மற்றும் பாரம்பரியத்தின் அடிப்படையில் மாற்றம் வந்ததை விவரிக்கிறது.',
      featured_image: 'https://example.com/literature3.jpg',
      additional_images: [
        'https://example.com/literature3a.jpg',
        'https://example.com/literature3b.jpg',
      ],
      category: 'Literature',
      index: 3,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'சாதனையாளர்கள்: சாதனையின் பெருமை',
      english_heading: 'Celebrated Achievers',
      year_ce: 1800,
      year_ta: 1500,
      english_long_text:
        'Highlighting the contributions of individuals who have made significant impacts in various fields.',
      tamil_long_text:
        'விவசாயம், அறிவியல் மற்றும் கலை போன்ற பல துறைகளில் குறிப்பிடத்தகுந்த தாக்கத்தை ஏற்படுத்திய நபர்களின் சாதனைகளை விளக்குகிறது.',
      featured_image: 'https://example.com/achievers1.jpg',
      additional_images: ['https://example.com/achievers1a.jpg'],
      category: 'Achievers',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'விருது பெற்றோர்: பாராட்டுக்களும் பெருமையும்',
      english_heading: 'Esteemed Award Recipients',
      year_ce: 1990,
      year_ta: 1690,
      english_long_text:
        'Celebrating individuals and groups honored with national and international awards.',
      tamil_long_text:
        'தேசிய மற்றும் சர்வதேச விருதுகளை பெற்ற நபர்களையும், குழுக்களையும் கொண்டாடும் பதிவு.',
      featured_image: 'https://example.com/awardee2.jpg',
      additional_images: ['https://example.com/awardee2a.jpg'],
      category: 'Awardee',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'விருதுகள்: பரிசுகளும் பாராட்டுகளும்',
      english_heading: 'Notable Awardees',
      year_ce: 2000,
      year_ta: 1700,
      english_long_text:
        'Details of individuals and organizations who have received prestigious awards.',
      tamil_long_text:
        'பெருமைக்குரிய விருதுகளை பெற்ற நபர்களின் மற்றும் நிறுவனங்களின் விவரங்களை வழங்குகிறது.',
      featured_image: 'https://example.com/awardee1.jpg',
      additional_images: ['https://example.com/awardee1a.jpg', 'https://example.com/awardee1b.jpg'],
      category: 'Awardee',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'செயற்பாட்டு தரவுகள்: வளர்ச்சி மற்றும் முன்னேற்றம்',
      english_heading: 'Performance Metrics Overview',
      year_ce: 2010,
      year_ta: 1710,
      english_long_text: 'Analysis of performance data from various sectors over the past decade.',
      tamil_long_text:
        'கடந்த தசாப்தத்தில் பல துறைகளில் சேகரிக்கப்பட்ட செயற்பாட்டு தரவுகளின் பகுப்பாய்வு.',
      featured_image: 'https://example.com/performance1.jpg',
      additional_images: [
        'https://example.com/performance1a.jpg',
        'https://example.com/performance1b.jpg',
      ],
      category: 'Performance data',
      index: 1,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'செயற்பாட்டு தரவு: வளர்ச்சியின் அட்டவணை',
      english_heading: 'Economic Performance Metrics',
      year_ce: 2015,
      year_ta: 1715,
      english_long_text:
        'Statistical insights into the economic performance across different sectors.',
      tamil_long_text:
        'பல்வேறு துறைகளில் பொருளாதார வளர்ச்சியின் புள்ளிவிவரங்களை பகுப்பாய்வு செய்யும் பதிவு.',
      featured_image: 'https://example.com/performance2.jpg',
      additional_images: ['https://example.com/performance2a.jpg'],
      category: 'Performance data',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'சாதனையாளர்கள்: நவீன சாதனைகள்',
      english_heading: 'Modern Day Achievers',
      year_ce: 2020,
      year_ta: 1720,
      english_long_text: 'Profiles of contemporary achievers making a mark in various fields.',
      tamil_long_text:
        'பல்வேறு துறைகளில் தனது சாதனைகளைக் காட்டும் நவீன சாதனையாளர்களின் வாழ்க்கை வரலாறு.',
      featured_image: 'https://example.com/achievers2.jpg',
      additional_images: [
        'https://example.com/achievers2a.jpg',
        'https://example.com/achievers2b.jpg',
      ],
      category: 'Achievers',
      index: 2,
      date: '2025-04-03',
    },
    {
      tamil_heading: 'அரசர்களின் வரலாறு: புதிய தலைமுறை',
      english_heading: 'Rulers of the New Age',
      year_ce: 2100,
      year_ta: 1800,
      english_long_text: 'Forecasting the future of leadership with emerging new age rulers.',
      tamil_long_text:
        'புதிய தலைமுறை அரசர்களின் வரலாற்றையும், எதிர்காலத்தை மையப்படுத்தும் தலைமுறையின் வழிவகுப்பையும் ஆராய்கிறது.',
      featured_image: 'https://example.com/rulers3.jpg',
      additional_images: ['https://example.com/rulers3a.jpg', 'https://example.com/rulers3b.jpg'],
      category: 'Rulers',
      index: 3,
      date: '2025-04-03',
    },
  ]

  return Promise.resolve(items)
}
