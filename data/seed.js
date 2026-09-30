// Data l'bdaya (kat-t-insera mra wa7da ila DB khawya). Ba3d, kolchi kat-t-bddl mn /admin.
// Kol ta3rif: [English, Français, العربية]
module.exports = {
  categories: [
    ['bowls',  ['Signature Bowls', 'Bowls signature', 'الأطباق المميزة']],
    ['build',  ['Build Your Own', 'Composez le vôtre', 'ركّب طبقك']],
    ['juices', ['Juices', 'Jus', 'العصائر']],
    ['snacks', ['Snacks & Sides', 'Snacks & accompagnements', 'وجبات خفيفة وإضافات']],
    ['drinks', ['Drinks', 'Boissons', 'المشروبات']]
  ],
  // [category, price, img, isNew, name[], desc[]]  (prix dyal spicy-tuna w ma ta7to = placeholders)
  dishes: [
    ['bowls', 170, 'avocado-burger.jpg', 1, ['Avocado Burger', 'Burger à l\'avocat', 'برجر الأفوكادو'],
      ['Avocado-edamame burger served with tortilla chips.', 'Burger avocat-edamame servi avec des chips de tortilla.', 'برجر الأفوكادو والإدامامي يُقدَّم مع رقائق التورتيلا.']],
    ['bowls', 200, 'hawaiian-salmon.jpg', 0, ['Hawaiian Salmon', 'Saumon hawaïen', 'سلمون هاواي'],
      ['Poke with salmon, mango, edamame, guacamole, chili mayo, sesame and rice.', 'Poke au saumon, mangue, edamame, guacamole, mayo pimentée, sésame et riz.', 'بوكي بالسلمون والمانجو والإدامامي والغواكامولي ومايونيز حار والسمسم والأرز.']],
    ['bowls', 210, 'spicy-salmon.jpg', 0, ['Spicy Salmon', 'Saumon épicé', 'سلمون حار'],
      ['Poke with salmon, edamame, tomato, guacamole, amarillo mayo and rice.', 'Poke au saumon, edamame, tomate, guacamole, mayo amarillo et riz.', 'بوكي بالسلمون والإدامامي والطماطم والغواكامولي ومايونيز أماريلو والأرز.']],
    ['bowls', 210, 'spicy-tuna.jpg', 0, ['Spicy Tuna', 'Thon épicé', 'تونة حارة'],
      ['Poke with tuna, pineapple, guacamole, spring onion and chili.', 'Poke au thon, ananas, guacamole, oignon nouveau et piment.', 'بوكي بالتونة والأناناس والغواكامولي والبصل الأخضر والفلفل الحار.']],
    ['bowls', 190, 'mango-chicken.jpg', 0, ['Mango Chicken', 'Poulet mangue', 'دجاج بالمانجو'],
      ['Poke with chicken, mango, guacamole, tomato and coriander.', 'Poke au poulet, mangue, guacamole, tomate et coriandre.', 'بوكي بالدجاج والمانجو والغواكامولي والطماطم والكزبرة.']],
    ['bowls', 190, 'spicy-chicken.jpg', 0, ['Spicy Chicken', 'Poulet épicé', 'دجاج حار'],
      ['Poke with chicken, pineapple, edamame, guacamole and chili.', 'Poke au poulet, ananas, edamame, guacamole et piment.', 'بوكي بالدجاج والأناناس والإدامامي والغواكامولي والفلفل الحار.']],
    ['build', 180, null, 0, ['Build Your Own Bowl', 'Bowl à composer', 'ركّب طبقك بنفسك'],
      ['Choose your base, protein, toppings and sauce.', 'Choisissez votre base, protéine, garnitures et sauce.', 'اختر القاعدة والبروتين والإضافات والصلصة.']],
    ['juices', 55, null, 0, ['Fresh Orange Juice', 'Jus d\'orange frais', 'عصير برتقال طازج'], ['Pressed to order.', 'Pressé à la commande.', 'يُعصر عند الطلب.']],
    ['juices', 60, null, 0, ['Green Juice', 'Jus vert', 'عصير أخضر'], ['Apple, spinach, cucumber and lemon.', 'Pomme, épinards, concombre et citron.', 'تفاح وسبانخ وخيار وليمون.']],
    ['snacks', 79, null, 0, ['Tortilla Chips & Guacamole', 'Chips de tortilla & guacamole', 'رقائق التورتيلا والغواكامولي'], ['House-fried chips with lime guacamole.', 'Chips maison avec guacamole au citron vert.', 'رقائق مقلية في المطعم مع غواكامولي بالليمون.']],
    ['snacks', 55, null, 0, ['Edamame', 'Edamame', 'إدامامي'], ['Steamed, with sea salt.', 'Cuit à la vapeur, au sel de mer.', 'مطهو على البخار مع ملح البحر.']],
    ['drinks', 35, null, 0, ['Sparkling Water', 'Eau pétillante', 'مياه غازية'], ['33 cl.', '33 cl.', '33 سل.']],
    ['drinks', 40, null, 0, ['Soda', 'Soda', 'مشروب غازي'], ['33 cl.', '33 cl.', '33 سل.']]
  ]
};
