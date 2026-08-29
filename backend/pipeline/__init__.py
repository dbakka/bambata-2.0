"""BAMBATA 2.0 - Audio Processing Pipeline Module."""
from app.services.vocal_extractor import BSRoformerExtractor
from .vocal_engine import BSRoformerNeuralVocalEngine, neural_vocal_engine

__all__ = ["BSRoformerExtractor", "BSRoformerNeuralVocalEngine", "neural_vocal_engine"]
