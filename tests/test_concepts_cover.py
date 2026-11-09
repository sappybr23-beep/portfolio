from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ConceptsCardParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_concepts_card = False
        self.video_attrs = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "a" and attributes.get("href") == "projects/concepts.html":
            self.in_concepts_card = True
        elif self.in_concepts_card and tag == "video":
            self.video_attrs = attributes

    def handle_endtag(self, tag):
        if tag == "a" and self.in_concepts_card:
            self.in_concepts_card = False


class ConceptsCoverTest(unittest.TestCase):
    def test_concepts_card_uses_looping_muted_showreel(self):
        parser = ConceptsCardParser()
        parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))

        self.assertIsNotNone(parser.video_attrs)
        self.assertEqual(parser.video_attrs.get("src"), "assets/video/showreel-ui.mp4")
        self.assertEqual(
            parser.video_attrs.get("poster"),
            "assets/img/7ZRT0RH0VA4MEDFQQSR0DP57DM.png",
        )
        for attribute in ("autoplay", "muted", "loop", "playsinline"):
            self.assertIn(attribute, parser.video_attrs)
        self.assertTrue((ROOT / "assets/video/showreel-ui.mp4").is_file())


if __name__ == "__main__":
    unittest.main()
