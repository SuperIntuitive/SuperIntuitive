<?php
namespace SuperIntuitive;

final class Editor {
    public static function Language(string $header): string {
        $language = 'en';
        $best = 0;
        foreach (explode(',', strtolower($header)) as $value) {
            $parts = explode(';', $value);
            $range = trim(array_shift($parts));
            if (!preg_match('/^[a-z]{2,3}(?:-[a-z0-9]+)*$/D', $range)) continue;
            $code = explode('-', $range, 2)[0];
            if (!in_array($code, ['en', 'es', 'zh', 'tl'], true)) continue;
            $quality = 1000;
            foreach ($parts as $parameter) {
                $parameter = trim($parameter);
                if (!str_starts_with($parameter, 'q=')) continue;
                $weight = substr($parameter, 2);
                $quality = preg_match('/^(?:0(?:\.[0-9]{0,3})?|1(?:\.0{0,3})?)$/D', $weight)
                    ? (int) round((float) $weight * 1000) : 0;
            }
            if ($quality > $best) { $language = $code; $best = $quality; }
        }
        return $language;
    }

    public static function Locale(string $header): array {
        $language = self::Language($header);
        if ($language === 'en') return ['language' => 'en', 'texts' => []];
        $file = dirname(__DIR__).'/editor/locales/'.$language.'.json';
        $source = file_get_contents($file);
        if ($source === false) throw new \RuntimeException('Cannot read editor translations: '.$language);
        $locale = json_decode($source, true, 512, JSON_THROW_ON_ERROR);
        if (($locale['language'] ?? null) !== $language || !is_array($locale['texts'] ?? null)) {
            throw new \RuntimeException('INVALID_EDITOR_TRANSLATION');
        }
        return $locale;
    }

    public static function Bootstrap(array $locale): string {
        $flags = JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
        return "\"use strict\";\nif(!SI){var SI={};}\nSI.EditorLanguage="
            .json_encode($locale['language'], $flags).";\nSI.EditorText="
            .json_encode((object) $locale['texts'], $flags).";\n";
    }
}
