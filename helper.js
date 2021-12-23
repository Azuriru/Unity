const mon = 'Dragonite';
fetch('https://unite-db.com/pokemon.json')
    .then(data => data.json())
    .then(data => data.find(({ name }) => name === mon))
    .then(({ name, stats: {
        combat,
        resistance,
        mobility,
        scoring,
        assistance: support
    }, tags: {
        range,
        difficulty,
        role
    }, damage_type }) => {
        return {
            [`${name.toLowerCase()}`]: {
                evolutions: {},
                stats: {
                    combat,
                    resistance,
                    mobility,
                    scoring,
                    support
                },
                tags: {
                    range,
                    difficulty,
                    role,
                    damage: damage_type
                }
            }
        }
    })
    .then(data => window.pokemon = data);

window.pokemon[mon].stats = {};

fetch('https://unite-db.com/stats.json')
    .then(data => data.json())
    .then(data => data.find(({ name }) => name === 'dragonite'))
    .then(({ name, level }) => {
        const newLvls = level.map(({ hp, attack, defense, sp_attack, sp_defense, crit, cdr, lifesteal }) => {
            return { hp, attack, defense, sp_attack, sp_defense, crit, cdr, lifesteal };
        });
        window.pokemon[name].stats.levels = newLvls;
    })
    .then(() => navigator.clipboard.write(JSON.stringify(pokemon, null, 4)));

// Held Items
json.map(({
    name,
    bonus1,
    bonus2,
    stats,
    description1: description,
    description3: stat,
    level1,
    level10,
    level20,
}) => {
    return {
        alias: [name.toLowerCase().replace(/ /g, '')],
        name,
        bonus: [
            bonus1,
            bonus2
        ].filter(Boolean),
        stats,
        description,
        passive: {
            stat,
            levels: [
                level1,
                level10,
                level20
            ]
        }
    }
});