/* Eines comunes dels minijocs de l'Escape Room de la Castanyada & Halloween.
   Tot en un objecte global `Joc`: capçalera, so, pentagrama, figures, premi i festa. */
(function () {
    const CLAU = 'aulatech-escape-halloween-1';
    const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

    // ---------- Utilitats ----------
    const barreja = arr => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    };
    const tria = arr => arr[Math.floor(Math.random() * arr.length)];
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const $ = (sel, el = document) => el.querySelector(sel);
    const reinicia = (el, classe) => { el.classList.remove(classe); void el.offsetWidth; el.classList.add(classe); };

    // ---------- Segells per dispositiu ----------
    // Cada ordinador genera una llavor aleatòria (es guarda al navegador) i en surten 8 segells propis.
    // Així cada grup té una contrasenya diferent i no es pot copiar la del costat.
    const CLAU_LLAVOR = CLAU + '-llavor';
    const ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sense 0/O, 1/I/L, per no confondre's
    const PER_DEFECTE = '1A5OC74W'; // si el navegador no deixa desar res
    let llavorMemoria = null;
    function novaLlavor() {
        const b = new Uint32Array(2);
        (window.crypto || window.msCrypto).getRandomValues(b);
        const s = b[0].toString(36) + b[1].toString(36);
        try { localStorage.setItem(CLAU_LLAVOR, s); llavorMemoria = s; } catch (e) { llavorMemoria = null; }
        return s;
    }
    function llavor() {
        if (llavorMemoria) return llavorMemoria;
        try { llavorMemoria = localStorage.getItem(CLAU_LLAVOR) || novaLlavor(); } catch (e) { llavorMemoria = null; }
        return llavorMemoria;
    }
    // Hash FNV-1a de 32 bits (determinista: mateixa llavor → mateixos segells)
    const hash = txt => {
        let h = 0x811c9dc5;
        for (const c of txt) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
        // Barreja final (fmix32) perquè segells consecutius no segueixin cap patró
        h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
        return h >>> 0;
    };
    /** Segell (1 caràcter) del repte 1..8 per a aquest ordinador. */
    function segell(repte) {
        const l = llavor();
        if (!l) return PER_DEFECTE[repte - 1];
        return ALFABET[hash(`${l}:${repte}`) % ALFABET.length];
    }
    const contrasenya = () => [1, 2, 3, 4, 5, 6, 7, 8].map(segell).join('');
    /** Codi curt d'equip, per si el docent ho vol comprovar (mateixa llavor = mateix codi). */
    const codiEquip = () => { const l = llavor(); return l ? (hash(l) % 9000 + 1000).toString() : '----'; };

    let silenci = false;
    try { silenci = localStorage.getItem(CLAU + '-so') === '0'; } catch (e) {}

    // ---------- So (Web Audio, sense fitxers) ----------
    let ac = null, master = null;
    const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);
    function audio() {
        if (!ac) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ac = new AC();
            master = ac.createGain();
            master.gain.value = silenci ? 0 : .6;
            master.connect(ac.destination);
        }
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }
    function to(f, t, dur, { tipus = 'sine', vol = .2, atac = .01 } = {}) {
        const a = audio(); if (!a) return;
        const o = a.createOscillator(), g = a.createGain();
        o.type = tipus; o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + atac);
        g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur + .05);
    }
    function soroll(t, dur, { vol = .3, filtre = 'highpass', fq = 6000 } = {}) {
        const a = audio(); if (!a) return;
        const len = Math.floor(a.sampleRate * dur);
        const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = a.createBufferSource(); s.buffer = buf;
        const fl = a.createBiquadFilter(); fl.type = filtre; fl.frequency.value = fq;
        const g = a.createGain(); g.gain.value = vol;
        s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
    }
    const ara = () => (audio() ? ac.currentTime : 0);

    const so = {
        get silenci() { return silenci; },
        ara,
        /** Nota tipus "capseta de música / piano" */
        nota(midi, { t = ara(), dur = 1, vol = .22 } = {}) {
            to(freq(midi), t, dur, { tipus: 'triangle', vol });
            to(freq(midi * 1 + 12), t, dur * .5, { tipus: 'sine', vol: vol * .3 });
            to(freq(midi), t, dur * .25, { tipus: 'square', vol: vol * .08 });
        },
        /** Percussió: 'bombo', 'caixa', 'charles', 'fusta' (woodblock), 'clic' (metrònom) */
        cop(tipus = 'fusta', t = ara(), vol = 1) {
            const a = audio(); if (!a) return;
            if (tipus === 'bombo') {
                const o = a.createOscillator(), g = a.createGain();
                o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .25);
                g.gain.setValueAtTime(.8 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .35);
                o.connect(g); g.connect(master); o.start(t); o.stop(t + .4);
            } else if (tipus === 'caixa') {
                soroll(t, .18, { vol: .35 * vol, filtre: 'bandpass', fq: 1800 });
                to(190, t, .12, { tipus: 'triangle', vol: .25 * vol });
            } else if (tipus === 'charles') {
                soroll(t, .06, { vol: .25 * vol });
            } else if (tipus === 'clic') {
                to(1500, t, .05, { tipus: 'square', vol: .06 * vol });
            } else if (tipus === 'clicFort') {
                to(2000, t, .06, { tipus: 'square', vol: .1 * vol });
            } else {
                to(820, t, .09, { tipus: 'sine', vol: .5 * vol, atac: .002 });
                to(1640, t, .04, { tipus: 'sine', vol: .15 * vol, atac: .002 });
            }
        },
        /**
         * Toca un ritme. `ritme` és una llista de figures (claus de FIGURES, p. ex. ['negra','corxera','corxera','sNegra']).
         * Fa un compte enrere de `compte` temps amb metrònom. Retorna una promesa que acaba quan s'ha tocat.
         * `enCop(i)` es crida en començar cada figura (per il·luminar-la).
         */
        async ritme(ritme, { tempo = 90, compte = 4, instrument = 'fusta', metronom = true, enCop } = {}) {
            const a = audio(); if (!a) return;
            const negra = 60 / tempo;
            let t = a.currentTime + .15;
            for (let i = 0; i < compte; i++) this.cop(i === 0 ? 'clicFort' : 'clic', t + i * negra);
            t += compte * negra;
            const inici = t;
            const total = ritme.reduce((s, k) => s + FIGURES[k].valor, 0);
            if (metronom) for (let b = 0; b < Math.ceil(total); b++) this.cop('clic', inici + b * negra, .6);
            const temps = [];
            ritme.forEach(k => {
                const f = FIGURES[k];
                if (!f.silenci) this.cop(instrument, t);
                temps.push(t);
                t += f.valor * negra;
            });
            if (enCop) temps.forEach((tt, i) => setTimeout(() => enCop(i), (tt - a.currentTime) * 1000));
            await espera((t - a.currentTime) * 1000 + 150);
        },
        be() { const t = ara(); this.nota(79, { t, dur: .4, vol: .15 }); this.nota(84, { t: t + .09, dur: .6, vol: .15 }); },
        malament() { const t = ara(); to(freq(50), t, .25, { tipus: 'square', vol: .05 }); to(freq(49), t + .12, .3, { tipus: 'square', vol: .05 }); },
        clic() { to(freq(81), ara(), .1, { tipus: 'sine', vol: .07 }); },
        victoria() {
            const t = ara();
            [62, 65, 69, 67, 65, 64, 65, 74].forEach((m, i) => this.nota(m, { t: t + i * .18, dur: 1.2, vol: .18 }));
            [50, 57, 62, 65, 69].forEach(m => to(freq(m), t + 1.5, 2.6, { tipus: 'triangle', vol: .07, atac: .2 }));
        },
        commuta() {
            silenci = !silenci;
            try { localStorage.setItem(CLAU + '-so', silenci ? '0' : '1'); } catch (e) {}
            if (audio()) master.gain.setTargetAtTime(silenci ? 0 : .6, ac.currentTime, .05);
            return silenci;
        },
    };

    // ---------- Figures rítmiques ----------
    // valor en temps de negra. `glif` = caràcter Unicode (font Noto Music).
    const FIGURES = {
        rodona: { nom: 'Rodona', valor: 4, glif: '\u{1D15D}' },
        blancaP: { nom: 'Blanca amb punt', valor: 3, glif: '\u{1D15E}\u{1D16D}' },
        blanca: { nom: 'Blanca', valor: 2, glif: '\u{1D15E}' },
        negraP: { nom: 'Negra amb punt', valor: 1.5, glif: '\u{1D15F}\u{1D16D}' },
        negra: { nom: 'Negra', valor: 1, glif: '\u{1D15F}' },
        corxera: { nom: 'Corxera', valor: .5, glif: '\u{1D160}' },
        semicorxera: { nom: 'Semicorxera', valor: .25, glif: '\u{1D161}' },
        sRodona: { nom: 'Silenci de rodona', valor: 4, glif: '\u{1D13B}', silenci: true },
        sBlanca: { nom: 'Silenci de blanca', valor: 2, glif: '\u{1D13C}', silenci: true },
        sNegra: { nom: 'Silenci de negra', valor: 1, glif: '\u{1D13D}', silenci: true },
        sCorxera: { nom: 'Silenci de corxera', valor: .5, glif: '\u{1D13E}', silenci: true },
    };
    /** HTML d'un ritme escrit (figures en fila). `marca` = índex a ressaltar. */
    function ritmeHTML(ritme, { mida = 2.6, classe = '' } = {}) {
        return `<span class="musica j-ritme ${classe}" style="font-size:${mida}rem;display:inline-flex;gap:.35em;align-items:flex-end">` +
            ritme.map((k, i) => `<span data-i="${i}" title="${FIGURES[k].nom}">${FIGURES[k].glif}</span>`).join('') + '</span>';
    }

    // ---------- Notes i pentagrama (clau de sol) ----------
    // posició 0 = Mi4 (primera línia), 1 = Fa4 (primer espai)... 8 = Fa5 (cinquena línia)
    const NOMS = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
    const SEMITONS = [0, 2, 4, 5, 7, 9, 11];
    function infoPosicio(p) {
        const diat = 30 + p; // Mi4 = 4*7 + 2
        const octava = Math.floor(diat / 7), grau = ((diat % 7) + 7) % 7;
        return { nom: NOMS[grau], grau, octava, midi: 12 * (octava + 1) + SEMITONS[grau] };
    }

    /**
     * SVG d'un pentagrama en clau de sol.
     * notes: [{ p: posició, color?, etiqueta?, classe? }]. Retorna una cadena SVG.
     */
    function pentagrama(notes = [], { amplada = 520, gap = 16, clau = true, tinta = '#2b1a0c', marge = 3.5 } = {}) {
        const alt = gap * (4 + marge * 2);
        const baseY = gap * (marge + 4); // y de la primera línia (Mi4)
        const x0 = clau ? gap * 4.2 : gap;
        const yDe = p => baseY - p * gap / 2;
        let s = `<svg viewBox="0 0 ${amplada} ${alt}" width="100%" role="img" aria-label="Pentagrama" style="display:block;overflow:visible">`;
        for (let i = 0; i < 5; i++) s += `<line x1="0" x2="${amplada}" y1="${yDe(i * 2)}" y2="${yDe(i * 2)}" stroke="${tinta}" stroke-width="1.6" opacity=".85"/>`;
        if (clau) s += `<text x="${gap * .3}" y="${yDe(2) + gap * 1.0}" font-family="'Noto Music','Bravura','Apple Symbols',serif" font-size="${gap * 4.4}" fill="${tinta}">\u{1D11E}</text>`;
        const pas = notes.length ? (amplada - x0 - gap * 2) / notes.length : 0;
        notes.forEach((n, i) => {
            const x = x0 + pas * (i + .5) + gap;
            const y = yDe(n.p);
            const color = n.color || tinta;
            // línies addicionals
            for (let q = -2; q >= n.p; q -= 2) s += `<line x1="${x - gap * 1.1}" x2="${x + gap * 1.1}" y1="${yDe(q)}" y2="${yDe(q)}" stroke="${tinta}" stroke-width="1.6"/>`;
            for (let q = 10; q <= n.p; q += 2) s += `<line x1="${x - gap * 1.1}" x2="${x + gap * 1.1}" y1="${yDe(q)}" y2="${yDe(q)}" stroke="${tinta}" stroke-width="1.6"/>`;
            const amunt = n.p < 4;
            s += `<g class="${n.classe || ''}" data-i="${i}">`;
            s += `<line x1="${amunt ? x + gap * .62 : x - gap * .62}" x2="${amunt ? x + gap * .62 : x - gap * .62}" y1="${y}" y2="${amunt ? y - gap * 3.4 : y + gap * 3.4}" stroke="${color}" stroke-width="1.8"/>`;
            s += `<ellipse cx="${x}" cy="${y}" rx="${gap * .68}" ry="${gap * .48}" transform="rotate(-20 ${x} ${y})" fill="${color}"/>`;
            if (n.etiqueta) s += `<text x="${x}" y="${alt - 4}" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="800" font-size="${gap * .95}" fill="${color}">${n.etiqueta}</text>`;
            s += `</g>`;
        });
        return s + '</svg>';
    }

    // ---------- Rellotge global de l'escape room (50 min, el posa en marxa index.html) ----------
    const llegeixEstat = () => { try { return JSON.parse(localStorage.getItem(CLAU)) || {}; } catch (e) { return {}; } };
    const desaEstat = e => { try { localStorage.setItem(CLAU, JSON.stringify(e)); } catch (err) {} };
    /** Mil·lisegons que queden, o null si la partida no ha començat o no té rellotge. */
    function tempsRestant() {
        const e = llegeixEstat();
        if (!e.inici || !e.durada) return null;
        return e.durada - ((e.guanyat || Date.now()) - e.inici) - (e.penal || 0);
    }
    const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    /** Resta temps del rellotge global (penalització). */
    function penalitza(segons = 60) {
        const e = llegeixEstat();
        if (!e.inici || !e.durada) return;
        e.penal = (e.penal || 0) + segons * 1000;
        desaEstat(e);
        if (rellotgeEl) { reinicia(rellotgeEl, 'j-penal'); pintaRellotge(); }
    }
    let rellotgeEl = null;
    function pintaRellotge() {
        if (!rellotgeEl) return;
        const r = tempsRestant();
        if (r === null) { rellotgeEl.hidden = true; return; }
        rellotgeEl.hidden = false;
        rellotgeEl.textContent = '⏳ ' + mmss(r);
        rellotgeEl.classList.toggle('poc', r < 5 * 60000);
        if (r <= 0) {
            rellotgeEl.textContent = '⌛ 00:00';
            if (repteActual && !llegeixEstat().guanyat) fiDeTemps();
        }
    }

    // ---------- Icones il·lustrades (img/icones/*.png, fetes amb Higgsfield) ----------
    const ICONES = ['carbassa', 'castanya', 'panellet', 'moniato', 'paperina', 'fulla', 'ratpenat', 'espelma', 'lluna'];
    /** <img> d'una icona. classe opcional (p. ex. 'apagada' per a vides perdudes). */
    const icona = (nom, mida = 28, classe = '') =>
        `<img class="j-icona-img ${classe}" src="img/icones/${nom}.png" alt="" width="${mida}" height="${mida}" draggable="false">`;
    const imgIcones = {};
    ICONES.forEach(n => { const im = new Image(); im.src = `img/icones/${n}.png`; imgIcones[n] = im; });

    // ---------- Noms de l'equip (es demanen a l'inici, index.html) ----------
    /** "Anna, Pau i Joan" (o "equip" si no n'hi ha). */
    function noms() {
        const n = (llegeixEstat().noms || []).filter(Boolean);
        if (!n.length) return 'equip';
        return n.length === 1 ? n[0] : n.slice(0, -1).join(', ') + ' i ' + n[n.length - 1];
    }
    const nomEquip = () => llegeixEstat().equip || noms();
    // Substitueix {noms} i {equip} dins dels textos dels personatges
    const personalitza = txt => String(txt).replace(/\{noms\}/g, noms()).replace(/\{equip\}/g, nomEquip());

    // ---------- Pistes de Marrameu (cada pista resta 1 minut) ----------
    // Tres pistes per repte, cada cop més concretes. Docent: les podeu canviar aquí.
    const PISTES = {
        1: [
            'Les notes de les <b>línies</b>, de baix a dalt: <b>Mi, Sol, Si, Re, Fa</b>.',
            'Les notes dels <b>espais</b>, de baix a dalt: <b>Fa, La, Do, Mi</b>.',
            'Per sota del pentagrama: el <b>Re</b> penja de la 1a línia i el <b>Do</b> té una línia addicional. Per sobre: el <b>Sol</b> penja de la 5a línia i el <b>La</b> té una línia addicional.',
        ],
        2: [
            'Compteu en veu alta <b>1, 2, 3, 4</b> mentre sona l\'eco i fixeu-vos en quins temps hi ha cop.',
            'Una <b>blanca</b> és un cop que dura 2 temps; dues <b>corxeres</b> són dos cops ràpids dins d\'un sol temps.',
            'Un <b>silenci</b> és un temps sense cop: si sentiu un forat dins del compàs, la partitura bona té un silenci en aquell lloc.',
        ],
        3: [
            'Totes les paraules són de música: <b>figures, notes, llenguatge musical o instruments</b>. Llegiu bé el tema de la pista.',
            'Comenceu per les <b>vocals</b> (A, E, I, O): surten a gairebé totes les paraules.',
            'Lletres que surten molt en català: <b>A, E, L, R, S, T, N</b>. Les castanyes només es cremen amb les lletres que NO hi són.',
        ],
        4: [
            'Les carbasses van de la més <b>greu</b> (esquerra) a la més <b>aguda</b> (dreta).',
            'Canteu la melodia fluixet mentre sona: costa menys recordar-la cantada que mirada.',
            'A la fase d\'oïda: si la nota <b>puja</b>, aneu cap a la dreta; si <b>baixa</b>, cap a l\'esquerra. I feu servir les llanternes!',
        ],
        5: [
            '<b>Corda</b>: fregada (violí, viola, violoncel, contrabaix), pinçada (guitarra, arpa) o percudida (piano).',
            '<b>Vent fusta</b> no vol dir fet de fusta: el <b>saxòfon</b> i la <b>flauta travessera</b> són vent fusta encara que siguin de metall (tenen canya o bisell).',
            '<b>Vent metall</b>: el so es fa vibrant els llavis a l\'embocadura (trompeta, trompa, trombó, tuba). <b>Percussió</b>: es colpeja, es frega o es sacseja.',
        ],
        6: [
            'Rodona <b>4</b> temps · blanca <b>2</b> · negra <b>1</b> · corxera <b>½</b> · semicorxera <b>¼</b>.',
            'El <b>puntet</b> afegeix la meitat del valor: blanca amb punt = <b>3</b> temps; negra amb punt = <b>1 i ½</b>.',
            'Cada <b>silenci</b> dura el mateix que la seva figura: silenci de negra = 1 temps, silenci de blanca = 2 temps.',
        ],
        7: [
            'El número de dalt del compàs diu quants temps cal omplir: <b>2/4</b> = 2 temps, <b>3/4</b> = 3 temps, <b>4/4</b> = 4 temps.',
            'Recordeu els valors: rodona 4, blanca amb punt 3, blanca 2, negra amb punt 1½, negra 1, corxera ½, semicorxera ¼. <b>Els silencis també compten!</b>',
            'Si la recepta demana el <b>mínim de figures</b>, comenceu per la figura més llarga que hi càpiga.',
        ],
        8: [
            'Si una pregunta d\'oïda us costa, <b>torneu-la a escoltar</b> abans de respondre (però vigileu el temps!).',
            'Notes en <b>línies</b>: Mi, Sol, Si, Re, Fa. Notes en <b>espais</b>: Fa, La, Do, Mi.',
            'Trampes típiques: el <b>saxòfon</b> és vent fusta, el <b>piano</b> és corda percudida i el <b>xilòfon</b> és percussió afinada.',
        ],
    };
    let repteActual = 0;
    async function demanaPista() {
        if (!repteActual || $('.j-dialeg')) return;
        const e = llegeixEstat();
        e.pistes = e.pistes || {};
        const usades = e.pistes[repteActual] || 0;
        const llista = PISTES[repteActual] || [];
        if (usades >= llista.length) {
            await dialeg([{ qui: 'marrameu', text: 'Miau… Ja us he donat <b>totes les pistes</b> que sé d\'aquest lloc. Ara és cosa vostra, {noms}!' }], { boto: 'D\'acord' });
            return;
        }
        const teRellotge = tempsRestant() !== null;
        const ok = await confirma(`Voleu una pista? ${teRellotge ? 'Us costarà <b>1 minut</b> del rellotge.' : ''} (Pista ${usades + 1} de ${llista.length})`);
        if (!ok) return;
        penalitza(60);
        const e2 = llegeixEstat(); e2.pistes = e2.pistes || {};
        e2.pistes[repteActual] = usades + 1;
        desaEstat(e2);
        pintaBotoPista();
        await dialeg([{ qui: 'marrameu', text: `Pista ${usades + 1}: ${llista[usades]}` }], { boto: 'Gràcies, Marrameu!' });
    }
    // Pregunta sí/no amb Marrameu
    function confirma(text) {
        return new Promise(resol => {
            const el = document.createElement('div');
            el.className = 'j-dialeg';
            el.innerHTML = `
                <div class="j-dialeg-caixa j-entra">
                    ${retrat('marrameu', 110)}
                    <div class="j-dialeg-bombolla" style="--c:${PERSONATGES.marrameu.color}">
                        <strong class="j-nom">Marrameu</strong>
                        <p>${personalitza(text)}</p>
                        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:.8rem">
                            <button class="j-boto fantasma" data-no>Ara no</button>
                            <button class="j-boto" data-si>💡 Sí, una pista</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(el);
            pausa();
            const tanca = v => { el.remove(); so.clic(); repren(); resol(v); };
            $('[data-si]', el).addEventListener('click', () => tanca(true));
            $('[data-no]', el).addEventListener('click', () => tanca(false));
            el.addEventListener('click', ev => { if (ev.target === el) tanca(false); });
            $('[data-si]', el).focus();
        });
    }
    let botoPista = null;
    function pintaBotoPista() {
        if (!botoPista) return;
        const usades = (llegeixEstat().pistes || {})[repteActual] || 0;
        const total = (PISTES[repteActual] || []).length;
        botoPista.innerHTML = `💡<span>Pista</span><small>${total - usades}</small>`;
        botoPista.title = `Pistes que queden: ${total - usades}`;
    }

    // Avís dins del joc quan s'acaba el temps global
    let avisFiTemps = false;
    function fiDeTemps() {
        if (avisFiTemps) return;
        avisFiTemps = true;
        dialeg([
            { qui: 'bruixot', text: 'A… a… <b>ATXIIIM!</b> S\'ha acabat el temps! La Melodia de la Nit és meva… bé, de la meva al·lèrgia.' },
            { qui: 'marrameu', text: 'Miau! {noms}, tornem al <b>mapa</b> a veure quants segells hem salvat.' },
        ], { boto: 'Tornar al mapa' }).then(() => { location.href = 'index.html'; });
    }

    // ---------- Capçalera comuna ----------
    function capcalera({ repte, titol }) {
        const b = document.createElement('header');
        b.className = 'j-barra';
        b.innerHTML = `
            <a class="j-tornar" href="index.html">← Mapa</a>
            <div class="j-titol"><small>REPTE ${ROMANS[repte - 1]}</small>${titol}</div>
            <span class="j-rellotge" title="Temps que queda per obrir el bagul" hidden></span>
            <button class="j-pista" aria-label="Demanar una pista a Marrameu"></button>
            <button class="j-icona" aria-label="Activar o silenciar el so">${silenci ? '🔇' : '🔊'}</button>`;
        repteActual = repte;
        botoPista = $('.j-pista', b);
        botoPista.addEventListener('click', demanaPista);
        pintaBotoPista();
        const boto = $('.j-icona', b);
        boto.addEventListener('click', () => { boto.textContent = so.commuta() ? '🔇' : '🔊'; });
        rellotgeEl = $('.j-rellotge', b);
        pintaRellotge();
        setInterval(pintaRellotge, 1000);
        document.body.prepend(b);
        document.title = `${titol} · Escape Room de la Nit`;
        // Il·lustració del lloc (img/lloc-N.jpg) com a fons difuminat i als diàlegs
        document.documentElement.style.setProperty('--fons-lloc', `url("img/lloc-${repte}.jpg")`);
        document.body.classList.add('j-amb-lloc');
    }

    /**
     * Has perdut el repte: el bruixot us atrapa, es resta temps del rellotge global
     * i es torna a començar. `reinicia` = funció del joc per tornar a començar (per defecte recarrega la pàgina).
     */
    function fracas({ motiu = 'Us heu quedat sense oportunitats.', segons = 60, reinicia: tornar } = {}) {
        penalitza(segons);
        so.malament();
        const teRellotge = tempsRestant() !== null;
        let p = $('.j-fracas');
        if (!p) { p = document.createElement('div'); p.className = 'j-premi j-fracas'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); document.body.appendChild(p); }
        p.innerHTML = `
            <div class="caixa">
                ${retrat('bruixot', 110)}
                <h2>A… a… ATXIM! Us he atrapat!</h2>
                <p>${motiu}</p>
                ${teRellotge ? `<p class="j-penal-text">⏳ −${Math.round(segons / 60)} min al rellotge</p>` : ''}
                <p>El repte torna a començar des del principi, i tot canviarà.</p>
                <div class="botons">
                    <button class="j-boto" data-torna>Tornar-ho a provar</button>
                    <a class="j-boto fantasma" href="index.html">← Mapa</a>
                </div>
            </div>`;
        $('[data-torna]', p).addEventListener('click', () => {
            p.classList.remove('obert');
            if (tornar) tornar(); else location.reload();
        });
        setTimeout(() => { p.classList.add('obert'); $('[data-torna]', p).focus(); }, 300);
    }

    // ---------- Avís flotant ----------
    let toastEl, toastT;
    function toast(text, tipus = '') {
        if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'j-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
        toastEl.className = `j-toast ${tipus} visible`;
        toastEl.textContent = text;
        clearTimeout(toastT);
        toastT = setTimeout(() => toastEl.classList.remove('visible'), 2200);
    }

    // ---------- Festa: pluja de carbasses, castanyes i notes ----------
    let canvas, ctx, raf, part = [];
    function festa(segons = 6) {
        if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'j-festa'; document.body.appendChild(canvas); ctx = canvas.getContext('2d'); }
        const dpr = window.devicePixelRatio || 1;
        canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const em = ['carbassa', 'castanya', 'fulla', 'panellet', 'paperina', 'ratpenat', '🎵', '🎶', '✨'];
        part = Array.from({ length: 80 }, () => ({
            x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight,
            v: 1.5 + Math.random() * 3, d: (Math.random() - .5) * 1.5, r: Math.random() * 6, vr: (Math.random() - .5) * .06,
            m: 18 + Math.random() * 20, e: tria(em),
        }));
        cancelAnimationFrame(raf);
        const fi = performance.now() + segons * 1000;
        const pas = now => {
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            part.forEach(p => {
                p.y += p.v; p.x += p.d + Math.sin(p.y / 40) * .6; p.r += p.vr;
                if (p.y > innerHeight + 30 && now < fi) { p.y = -30; p.x = Math.random() * innerWidth; }
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
                const im = imgIcones[p.e];
                if (im && im.complete && im.naturalWidth) ctx.drawImage(im, -p.m * .75, -p.m * .75, p.m * 1.5, p.m * 1.5);
                else { ctx.font = `${p.m}px serif`; ctx.textAlign = 'center'; ctx.fillText(p.e, 0, 0); }
                ctx.restore();
            });
            if (part.some(p => p.y < innerHeight + 30)) raf = requestAnimationFrame(pas);
        };
        raf = requestAnimationFrame(pas);
    }

    // ---------- Pausa mentre hi ha un diàleg obert ----------
    // Els jocs amb temporitzadors escolten els esdeveniments 'joc-pausa' i 'joc-repren' de window
    // (o consulten Joc.enPausa()) per aturar el temps mentre es llegeix una pista o un diàleg.
    let pauses = 0;
    const enPausa = () => pauses > 0;
    function pausa() { if (pauses++ === 0) window.dispatchEvent(new Event('joc-pausa')); }
    function repren() { if (pauses > 0 && --pauses === 0) window.dispatchEvent(new Event('joc-repren')); }

    // ---------- Personatges i diàlegs ----------
    // Retrat a img/<id>.png; si no hi és, es fa servir l'emoji.
    const PERSONATGES = {
        marrameu: { nom: 'Marrameu', emoji: '🐈‍⬛', color: '#ffcf5c' },
        castanyera: { nom: 'La Castanyera', emoji: '👵', color: '#ff9a4a' },
        bruixot: { nom: 'El Bruixot Estornut', emoji: '🧙', color: '#b58cff' },
    };
    const retrat = (qui, mida) => {
        const p = PERSONATGES[qui];
        return `<span class="j-retrat" style="width:${mida}px;height:${mida}px;--c:${p.color}">` +
            `<img src="img/${qui}.png" alt="" onerror="this.remove()"><span>${p.emoji}</span></span>`;
    };

    /**
     * Escena de diàleg a pantalla completa. linies: [{ qui: 'marrameu', text: '...' }].
     * Clic / Enter / Espai per avançar. Retorna una promesa quan s'acaba.
     */
    function dialeg(linies, { boto = 'Som-hi!' } = {}) {
        return new Promise(resol => {
            const el = document.createElement('div');
            el.className = 'j-dialeg';
            el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
            document.body.appendChild(el);
            pausa();
            let i = 0, escrivint = null;
            const mostra = () => {
                const l = { ...linies[i], text: personalitza(linies[i].text) }, p = PERSONATGES[l.qui];
                const ultima = i === linies.length - 1;
                el.innerHTML = `
                    <div class="j-dialeg-caixa j-entra">
                        ${retrat(l.qui, 110)}
                        <div class="j-dialeg-bombolla" style="--c:${p.color}">
                            <strong class="j-nom">${p.nom}</strong>
                            <p aria-live="polite"></p>
                            <button class="j-boto ${ultima ? 'verd' : 'fantasma'}">${ultima ? boto : 'Continuar →'}</button>
                        </div>
                    </div>`;
                const pEl = $('p', el), b = $('button', el);
                // Efecte màquina d'escriure (es pot saltar fent clic)
                let k = 0; clearInterval(escrivint);
                escrivint = setInterval(() => {
                    // Avança 2 caràcters visibles; les etiquetes HTML (<b>...) se salten senceres
                    for (let n = 0; n < 2 && k < l.text.length; n++) {
                        if (l.text[k] === '<') k = l.text.indexOf('>', k) + 1;
                        k++;
                    }
                    pEl.innerHTML = l.text.slice(0, k);
                    if (k >= l.text.length) { clearInterval(escrivint); escrivint = null; pEl.innerHTML = l.text; }
                }, 18);
                b.addEventListener('click', e => { e.stopPropagation(); avanca(); });
                b.focus();
            };
            const avanca = () => {
                so.clic();
                if (escrivint) { clearInterval(escrivint); escrivint = null; $('p', el).innerHTML = linies[i].text; return; }
                i++;
                if (i >= linies.length) { el.remove(); document.removeEventListener('keydown', tecla); repren(); resol(); }
                else mostra();
            };
            const tecla = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avanca(); } };
            el.addEventListener('click', avanca);
            document.addEventListener('keydown', tecla);
            mostra();
        });
    }

    /** Comentari breu d'un personatge a la cantonada (reaccions durant el joc). */
    let diuEl, diuT;
    function diu(qui, text, ms = 3200) {
        text = personalitza(text);
        if (!diuEl) { diuEl = document.createElement('div'); diuEl.className = 'j-diu'; diuEl.setAttribute('role', 'status'); document.body.appendChild(diuEl); }
        const p = PERSONATGES[qui];
        diuEl.innerHTML = `${retrat(qui, 56)}<div class="j-diu-text" style="--c:${p.color}"><strong class="j-nom">${p.nom}</strong>${text}</div>`;
        reinicia(diuEl, 'visible');
        clearTimeout(diuT);
        diuT = setTimeout(() => diuEl.classList.remove('visible'), ms);
    }

    // ---------- Premi: mostra el segell i marca el repte com a superat ----------
    // `epileg`: línies de diàleg que expliquen què passa a la història i on cal anar després.
    // El paràmetre `segell` s'ignora: el segell sempre surt de la llavor d'aquest ordinador.
    async function guanya({ repte, missatge = '', resum = '', tornarAJugar = true, epileg = null }) {
        const segellRepte = segell(repte);
        if (epileg && epileg.length) { so.victoria(); festa(4); await espera(1200); await dialeg(epileg, { boto: 'Veure el segell ✨' }); }
        try {
            const e = JSON.parse(localStorage.getItem(CLAU)) || {};
            e.superats = e.superats || Array(8).fill(false);
            e.superats[repte - 1] = true;
            localStorage.setItem(CLAU, JSON.stringify(e));
        } catch (err) {}
        let p = $('.j-premi');
        if (!p) { p = document.createElement('div'); p.className = 'j-premi'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); document.body.appendChild(p); }
        p.innerHTML = `
            <div class="caixa">
                <h2>Repte ${ROMANS[repte - 1]} superat, ${noms()}!</h2>
                ${missatge ? `<p>${missatge}</p>` : ''}
                <p>El segell d'aquest repte és:</p>
                <div class="j-segell" aria-label="Segell ${segellRepte}">${segellRepte}</div>
                <p>Apunteu-lo i escriviu-lo a la casella <b>${ROMANS[repte - 1]}</b> del bagul.</p>
                ${resum ? `<p>${resum}</p>` : ''}
                <div class="botons">
                    <a class="j-boto verd" href="index.html">← Tornar al bagul</a>
                    ${tornarAJugar ? '<button class="j-boto fantasma" data-de-nou>Tornar a jugar</button>' : ''}
                </div>
            </div>`;
        const deNou = $('[data-de-nou]', p);
        if (deNou) deNou.addEventListener('click', () => location.reload());
        so.victoria();
        festa();
        setTimeout(() => p.classList.add('obert'), 500);
    }

    // ---------- Antitrampes: sense copiar, enganxar ni captures ----------
    // Una pàgina web no pot impedir del tot una captura del sistema operatiu: aquí es dissuadeix
    // (es difumina la pantalla i un personatge us renya).
    const FRASES_TRAMPA = {
        copiar: [
            ['bruixot', 'A… a… ATXIM! Res de copiar! La música no es fotocopia, s\'aprèn.'],
            ['bruixot', 'Ei, ei! Aquí no es copia res. Ni les castanyes, ni les respostes!'],
            ['castanyera', 'Criatures, copiar és com menjar-se les castanyes crues: no serveix de res.'],
        ],
        enganxar: [
            ['bruixot', 'Enganxar? Només enganxo panellets amb pinyons! Escriviu-ho vosaltres.'],
            ['marrameu', 'Miau! Res d\'enganxar: les urpes al teclat i a pensar!'],
        ],
        captura: [
            ['bruixot', 'Una foto?! A… a… ATXIM! L\'encanteri ha esborrat la imatge.'],
            ['bruixot', 'Les captures de pantalla em fan esternudar… i difuminen tot el poble!'],
            ['marrameu', 'Miau, miau! Els segells són diferents a cada ordinador: la foto no us servirà!'],
        ],
        menu: [
            ['marrameu', 'Miau! Aquí el botó dret no fa res. Jugueu amb el cap!'],
        ],
    };
    let ultimAvis = 0;
    function avisTrampa(tipus) {
        if (Date.now() - ultimAvis < 1500) return;
        ultimAvis = Date.now();
        const [qui, text] = tria(FRASES_TRAMPA[tipus]);
        so.malament();
        diu(qui, text, 4200);
    }
    const esCamp = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    // Difumina la pantalla una estona (captures)
    let amagaT;
    function amaga(ms = 2500) {
        document.documentElement.classList.add('j-amagat');
        clearTimeout(amagaT);
        if (ms) amagaT = setTimeout(() => document.documentElement.classList.remove('j-amagat'), ms);
    }
    function antitrampes() {
        ['copy', 'cut'].forEach(ev => document.addEventListener(ev, e => {
            e.preventDefault();
            try { e.clipboardData && e.clipboardData.setData('text/plain', ''); } catch (err) {}
            avisTrampa('copiar');
        }, true));
        document.addEventListener('paste', e => { e.preventDefault(); e.stopImmediatePropagation(); avisTrampa('enganxar'); }, true);
        document.addEventListener('contextmenu', e => { e.preventDefault(); avisTrampa('menu'); });
        document.addEventListener('selectstart', e => { if (!esCamp(e.target)) e.preventDefault(); });
        document.addEventListener('dragstart', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            const k = (e.key || '').toLowerCase();
            const mod = e.ctrlKey || e.metaKey;
            if (k === 'printscreen') { e.preventDefault(); amaga(); avisTrampa('captura'); return; }
            // Cmd+Shift+3/4/5 (Mac) i Win+Shift+S (Windows)
            if ((e.metaKey && e.shiftKey && ['3', '4', '5', 's', '#', '$', '%'].includes(k)) || (e.shiftKey && e.metaKey && k === 's')) {
                amaga(); avisTrampa('captura'); return;
            }
            if (mod && ['c', 'x'].includes(k)) { e.preventDefault(); avisTrampa('copiar'); return; }
            if (mod && k === 'v') { e.preventDefault(); avisTrampa('enganxar'); return; }
            if (mod && ['p', 's', 'a', 'u'].includes(k)) { e.preventDefault(); avisTrampa(k === 'a' ? 'copiar' : 'captura'); }
        }, true);
        document.addEventListener('keyup', e => {
            if ((e.key || '').toLowerCase() === 'printscreen') {
                amaga();
                try { navigator.clipboard && navigator.clipboard.writeText(''); } catch (err) {}
                avisTrampa('captura');
            }
        }, true);
        // Si la finestra perd el focus (eina de retalls, una altra app…), es difumina fins que es torna
        window.addEventListener('blur', () => amaga(0));
        window.addEventListener('focus', () => setTimeout(() => document.documentElement.classList.remove('j-amagat'), 250));
        window.addEventListener('beforeprint', () => avisTrampa('captura'));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', antitrampes);
    else antitrampes();

    window.Joc = { enPausa, noms, nomEquip, PISTES, icona, ICONES, fracas, penalitza, tempsRestant, CLAU, segell, contrasenya, novaLlavor, codiEquip, ROMANS, barreja, tria, espera, $, reinicia, audio, so, FIGURES, ritmeHTML, NOMS, infoPosicio, pentagrama, capcalera, toast, festa, guanya, PERSONATGES, retrat, dialeg, diu };
})();
