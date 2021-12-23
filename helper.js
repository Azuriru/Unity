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


function getMove(e) {
    const upgrade = e.target.closest('.upgrade');
    const regular = e.target.closest('.activated-ability');

    if (upgrade) {
        const info = upgrade.querySelector('.info');
        const name = info.querySelector('h2').textContent;
        const cooldown = info.querySelector('.cooldown-pill').childNodes[1].textContent;
        const format = info.querySelector('.type-pill').textContent.trim();

        const data = upgrade.querySelector('.description');
        const [ desc, ...rest ] = data.children;
        const lvl = desc.querySelector('label').textContent.slice(6);
        const description = desc.querySelector('span').textContent.trim();
        const fields = rest
            .slice(0, -2)
            .map(field => {
                if (field.classList.contains('formula')) {
                    const title = field.querySelector('label').childNodes[0].textContent.trim().slice(0, -1);
                    const rsb = field.querySelector('.rsb');

                    if (rsb) {
                        const value = rsb.textContent.trim();
                        const [ modifier, level, end ] = [...rsb.children].map(c => c.textContent);

                        return [
                            `\t\t{`,
                                `\t"title": "${title}",`,
                                `\t"value": "${value}",`,
                                `\t"calc_variables": {`,
                                    `\t\t"atk_modifier": ${parseInt(modifier) / 100},`,
                                    `\t\t"lvl_modifier": ${parseInt(level.slice(2, -16))},`,
                                    `\t\t"addend": ${Number(end)}`,
                                `\t},`,
                                `\t"type": "inline"`,
                            `}`
                        ].join('\n\t\t');
                    } else {
                        const value = field.querySelector('span').textContent.trim();

                        return [
                            `\t\t{`,
                                `\t"title": "${title}",`,
                                `\t"value": "${value}",`,
                                `\t"type": "data"`,
                            `}`
                        ].join('\n\t\t');
                    }
                } else {
                    const title = field.querySelector('label').textContent.trim();
                    const value = field.querySelector('span').textContent.trim();

                    return [
                        `\t\t{`,
                            `\t"title": "${title}",`,
                            `\t"value": "${value}",`,
                            `\t"type": "data"`,
                        `}`
                    ].join('\n\t\t');
                }
            });

        return navigator.clipboard.write([
            `{`,
                `\t"aliases": ['s', '${name.toLowerCase().split(' ').join('')}'],`,
                `\t"name": "${name}",`,
                `\t"level": ${Number(lvl)},`,
                `\t"cd": ${parseInt(cooldown)},`,
                `\t"type": "${format.toLowerCase()}",`,
                `\t"description": "${description}",`,
                `\t"fields": [`,
                    `${fields.join(',\n')}`,
                `\t]`,
            `}`
        ].join('\n'));
    } else {
        console.log('else');
    }
}