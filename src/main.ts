/* Build JS file from TS */
import { XMLTranslation } from "./types";

const themeToggleBtn = document.getElementById("theme-toggle") as HTMLButtonElement;
const updateLanguageBtn = document.getElementById("selected-lang") as HTMLButtonElement;
const languageOptions = document.querySelector(".language-options") as HTMLUListElement;
let allTranslations: Array<XMLTranslation> = [];

const toogleThemeEvent = (ev: MouseEvent): void => {
    const body = document.body as HTMLElement;
    const currentTheme: string = body.classList.contains("dark") ? "dark" : "light";

    body.classList.remove("dark", "light");
    if (currentTheme === "dark") {
        body.classList.add("light");
        themeToggleBtn.innerHTML = `<i class='fa-solid fa-sun'></i>`;
        localStorage.setItem("preferredTheme", "light");
    }
    else {
        body.classList.add("dark");
        themeToggleBtn.innerHTML = `<i class='fa-solid fa-moon'></i>`;
        localStorage.setItem("preferredTheme", "dark");
    }
};

const changeLanguageEvent = (ev: MouseEvent): void => {
    languageOptions.classList.toggle("hidden");
};

const languageOptionsEvent = (ev: PointerEvent): void => {
    const option = ev.currentTarget as HTMLButtonElement;
    const currentLang: string = updateLanguageBtn.value.toLowerCase();
    const selectedLang: string = option.value.toLowerCase();

    // update the page language when the clicked language option
    if(selectedLang && (selectedLang !== currentLang)) {
        updateLanguageBtn.value = selectedLang;
        updateLanguageBtn.replaceChildren();
        option.childNodes.forEach(child => {
            updateLanguageBtn.appendChild(child.cloneNode(false));
        });

        localStorage.setItem("preferredLanguage", selectedLang);
        updateResumeLink(selectedLang);
        updateDocumentLanguage(selectedLang);
    }
    languageOptions.classList.toggle("hidden");
}

const updateResumeLink = (lang: string): void => {
    const resumeLink = document.getElementById("resume-link") as HTMLAnchorElement;
    resumeLink.href = `./assets/resume/Jadoulle_Tony_resume_${lang}.pdf`;
};

const updateDocumentLanguage = (updatedLang: string): void => {
    console.time(`Updating document language to: ${updatedLang}`);
    updatedLang = updatedLang.toLowerCase();
    const currentLang: string = document.documentElement.lang.toLowerCase();

    // don't update if the HTML document language is the same as the updated language
    if (currentLang === updatedLang) {
        console.info(`The document's language is already set to "${updatedLang}".`);
        console.timeEnd(`Updating document language to: ${updatedLang}`);
        return;
    }
    
    // attempt to find the translation for the updated language
    const translation: XMLTranslation = allTranslations.filter((t: XMLTranslation) => t.lang === updatedLang)[0];
    if (!translation) {
        throw new Error(`Translation for "${updatedLang}" language not found.`);
    }
    
    // check if the number of elements to translate are the same
    // if not, can not translate all HTML elements
    const HTMLTranslatableElements: NodeListOf<HTMLElement> = document.querySelectorAll("[data-translatable]");
    if (HTMLTranslatableElements.length !== translation.translateNodes.length) {
        throw new Error(`The number of elements to translate are not the same: "HTML elements: ${HTMLTranslatableElements.length} | XML nodes: "${translation.translateNodes.length}".`);
    }

    // translate the HTML document
    document.documentElement.lang = updatedLang;
    for (let i = 0; i < HTMLTranslatableElements.length; i++) {
        const element: HTMLElement = HTMLTranslatableElements.item(i);
        const transElement: Element = translation.translateNodes.item(i);

        if (element.getAttribute("data-translatable")?.toLowerCase() === transElement.nodeName.toLowerCase()) {
            //check if the HTML element also contains translatable child
            const HTMLChildrenTranslatable: NodeListOf<Element> = element.querySelectorAll("[data-translatable]");
            if (HTMLChildrenTranslatable.length > 0) {
                //translate the current HTML element with its children
                element.childNodes.forEach((child: ChildNode, index: number) => {
                    const transNode = transElement.childNodes.item(index);
                    child.textContent = transNode.textContent;
                });
            }
            else {
                element.textContent = transElement.textContent;
            }
        }
     }
    console.timeEnd(`Updating document language to: ${updatedLang}`);
};

const loadTranslationFile = async (): Promise<Document> => {
    const XMLParser = new DOMParser();
    const response = await fetch("./assets/XML/translations.xml");
    if (!response.ok) {
        throw new Error(`Error loading translation XML file: ${response.status} ${response.statusText}.`);
    }
    const xmlText = await response.text();

    return XMLParser.parseFromString(xmlText, "application/xml");
};

const init = (): void => {
    const prefLang: string | null = localStorage.getItem("preferredLanguage");
    const definedLang: string = prefLang?.toLowerCase() || document.documentElement.lang.toLowerCase();

    // Set the language button value to the preferred language or the default document's language
    if(updateLanguageBtn.value !== definedLang) {
        updateLanguageBtn.value = definedLang;
        const langOptions = document.querySelectorAll(".lang-option") as NodeListOf<HTMLButtonElement>;
        updateLanguageBtn.replaceChildren();
        langOptions.forEach((element: HTMLButtonElement) => {
            if (element.value === definedLang) {
                element.childNodes.forEach(child => {
                    updateLanguageBtn.appendChild(child.cloneNode(false));
                });
            }
        })
    }

    // set the preferred theme if present in localStorage or "dark" by default
    const preferredTheme: string = localStorage.getItem("preferredTheme") || "dark";
    document.body.classList.remove("dark", "light");

    if (preferredTheme.toLowerCase() === "dark") {
        document.body.classList.add("dark");
        themeToggleBtn.innerHTML = `<i class='fa-solid fa-moon'></i>`;
    }
    else {
        document.body.classList.add("light");
        themeToggleBtn.innerHTML = `<i class='fa-solid fa-sun'></i>`;
    }

    loadTranslationFile()
        .then((xmlDoc: Document) => {
            //set the possible languages according to the XML file
            const languages: Array<string> = ["en", "fr"];
            
            for (const language of languages) {
                const XMLElements: NodeListOf<Element> = xmlDoc.querySelectorAll(`[lang="${language.toLowerCase()}"]`);
                if (XMLElements.length === 0) {
                    throw new Error(`No translation found in the XML document for the language: ${language.toLowerCase()}`);
                }
                // create translation objects for each language
                allTranslations.push({
                    lang: language,
                    translateNodes: XMLElements
                });
            }
            updateDocumentLanguage(definedLang);
            updateResumeLink(definedLang);
        })
        .catch((error: Error) => console.error(error));
};

/**********/
/* EVENTS */
/**********/
themeToggleBtn.addEventListener("click", toogleThemeEvent);
updateLanguageBtn.addEventListener("click", changeLanguageEvent);
for (let i = 0; i < languageOptions.children.length; i++) {
    const option = languageOptions.children[i].firstElementChild as HTMLButtonElement;
    option.addEventListener("click", languageOptionsEvent);
}
window.addEventListener("load", init);
