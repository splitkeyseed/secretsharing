





class SecretSharing {
	constructor(secret, threshold, participants, supportedCharacters) {
        this.secret = secret;
        this.secretCharactersNumbers = [secret.length];
        this.threshold = threshold;
        this.participants = participants;
        this.numberOfParticipants = participants.length;
        this.supportedCharacters = supportedCharacters;
        this.recoverySets = [];
        this.participantsShares = new Map([]);

        this.numberToCharacterMap = new Map([]);
        this.characterToNumberMap = new Map([]);
        for (let i = 1; i <= supportedCharacters.length; i++) {
			let c = supportedCharacters.charAt(i - 1) + "";
			this.numberToCharacterMap.set(i, c);
			this.characterToNumberMap.set(c, i);
		}

        for (let i = 1; i <= secret.length; i++) {
			let c = secret.charAt(i - 1) + "";
            this.secretCharactersNumbers[i - 1] = this.characterToNumberMap.get(c);
        }
	}

    getNumbersAsCharacters(numbers) {
        let characters = "";
        for (let i = 0; i < numbers.length; i++) {
            let character = this.numberToCharacterMap.get(numbers[i]);
            characters = characters + character;
        }
        return characters;
    }

    findAllRecoverySetCombinations() {
        this.recoverySets = [];

        let threshold = this.threshold;
        let numberOfParticipants = this.numberOfParticipants;
        let allParticipants = this.participants;

		for (let i = 0; i < numberOfParticipants; i++) {
			let searchParticipants = allParticipants.substring(i + 1);
			let targetParticipant = allParticipants.charAt(i) + "";

			/**
			 * Stop iteration of participants if the number
			 * of remaining search participants + one target 
			 * participant are less than the threshold for a
			 * complete set. No further complete sets should
             * be found hereafter.
			 */
             if (searchParticipants.length + 1 < threshold)
                break;


            /**
			 * Create initial (incomplete) set which only
			 * includes the current target participant.
			 */
			let set = new RecoverySet(targetParticipant, threshold);  
            
            /**
			 * Initiate the search for the remaining (i.e.
			 * missing) participants sets that include the
			 * current target participant. 
			 */
			this.searchMissingRecoverySets(set, searchParticipants);
        }
    }

    searchMissingRecoverySets(set, searchParticipants) {
        let searchParticipantsArr = searchParticipants.split("");
        for (let i = 0; i < searchParticipantsArr.length; ++i) {
            let nextSearchParticipant = searchParticipants[i];

            /**
			 * Search for missing recovery sets
			 * with the next participant who are still
			 * missing some of their participant sets.
			 */
             set.appendParticipant(nextSearchParticipant);

            /**
			 * If the recovery set is complete (i.e. 
			 * has reached the threshold length) then add the
			 * set to the collection of all recovery sets. 
			 */
			if (set.isThresholdReached())
                this.recoverySets.push(set.participants);

            /**
			 * If the recovery set is not complete
			 * (i.e. has not reached the threshold length)
			 * then extend the search with an additional
			 * participant. The extended search is continued
			 * with the set that has an additional
			 * participant appended and hence this participant
			 * is excluded from the possible search 
			 * participants.
			 */
			let nextSearchParticipantIndex = searchParticipants.indexOf(nextSearchParticipant);
			let nextSearchParticipants = searchParticipants.substring(1 + nextSearchParticipantIndex);
			let hasMoreSearchableParticipants = nextSearchParticipants.length > 0;
			if (!set.isThresholdReached() && hasMoreSearchableParticipants)
				this.searchMissingRecoverySets(set, nextSearchParticipants);

            /**
			 * Remove the appended participant again so that
			 * the search for missing participants sets
			 * excluding this specific participant can
			 * continue. 
			 */
			set.removeLastParticipant();
        }

    }

    createAndDistributeShares() {
        let secretSize = this.secret.length;
        let supportedCharactersCount = this.supportedCharacters.length;

        this.recoverySets.forEach(set => {
            let nMinus1Numbers = [secretSize];
            let nMinus2Numbers = [secretSize];
            let calculationsIterationCount = 1;
            let setParticipantIndex = 0;
            let isAllSetParticipantsSharesCreated = false;
            while (!isAllSetParticipantsSharesCreated) {
                let setParticipant = set.charAt(setParticipantIndex).toString();

                if (!this.participantsShares.has(setParticipant))
                    this.participantsShares.set(setParticipant, new Map([]));

                let isFirstIteration = calculationsIterationCount == 1;
                let isSecondIteration = calculationsIterationCount == 2;
                let isNthIteration = calculationsIterationCount > 2;
                let isEvenIteration = calculationsIterationCount % 2 == 0;
                let isOddIteration = !isEvenIteration;
                let isLastIteration = setParticipantIndex == set.length - 1;

                /**
				 * Calculate (or generate) all the next character
				 * numbers required for the next iteration in the
				 * shares calculation process.
				 */
                let secretNumbers = this.secretCharactersNumbers;
				let nextShareCharactersNumbers = [secretSize];
				for (let k = 0; k < secretSize; k++) {
                    let characterNumberK = -1;

                    if (isFirstIteration) {
                        characterNumberK = this.getRandomIntWithCrypto(1, supportedCharactersCount);
                    } else 
                    if (isSecondIteration) {
                        characterNumberK = 
                            secretNumbers[k] - nMinus1Numbers[k] < 1 ?
                            secretNumbers[k] - nMinus1Numbers[k] + supportedCharactersCount :
                            secretNumbers[k] - nMinus1Numbers[k];
                    } else
                    if (isNthIteration && isOddIteration) {
                        characterNumberK = this.getRandomIntWithCrypto(1, supportedCharactersCount);
                    } else
                    if (isNthIteration && isEvenIteration) {
                        characterNumberK =
                            nMinus2Numbers[k] - nMinus1Numbers[k] < 1 ?
                            nMinus2Numbers[k] - nMinus1Numbers[k] + supportedCharactersCount :
                            nMinus2Numbers[k] - nMinus1Numbers[k];
                    }

                    nextShareCharactersNumbers[k] = characterNumberK;
                }

                let issueShare = isOddIteration || isLastIteration;
				if (issueShare) {
                    this.participantsShares
                        .get(setParticipant)
                        .set(set, nextShareCharactersNumbers);
                }

                /**
				 * Prepare for next iteration in the shares
				 * calculation process below here. End the
				 * process if the current iteration is the
				 * last iteration.
				 */
				if (issueShare) {
                    setParticipantIndex++;
                }

                nMinus2Numbers = nMinus1Numbers;
                nMinus1Numbers = nextShareCharactersNumbers;
                
                calculationsIterationCount++;
                
                if (isLastIteration) {
                    isAllSetParticipantsSharesCreated = true;
                }
            }
        });
    }

    recoverSecret(shareSetName, recoveryShares) {
        let currentNumbers = null;
        let nMinus1Numbers = null;
        let resolveNumbers = null;
        let supportedCharactersCount = this.supportedCharacters.length;

        let calculationsIterationCount = 1;
        for (let i = shareSetName.length - 1; i >= 0; i--){
            let setParticipant = shareSetName.charAt(i);
            let priorSetParticipant = shareSetName.charAt(i - 1);

            let isFirstIteration = calculationsIterationCount == 1;
		    let isLastIteration = i == 1;
            
            currentNumbers = isFirstIteration ? recoveryShares.get(setParticipant) : currentNumbers;
            nMinus1Numbers = recoveryShares.get(priorSetParticipant);
            if (currentNumbers.length != nMinus1Numbers.length) {
                alert("Error! Different size shares.");
                return "";
            }
            let secretSize = currentNumbers.length;
            resolveNumbers = [secretSize]


            /**
             * Resolve all the next character numbers
             * required for the next iteration in the
             * shares calculation process.
             */
            for (let k = 0; k < secretSize; k++) {
                let characterNumberK = 
                    nMinus1Numbers[k] + currentNumbers[k] > supportedCharactersCount ?
                    nMinus1Numbers[k] + currentNumbers[k] - supportedCharactersCount :
                    nMinus1Numbers[k] + currentNumbers[k];
                
                resolveNumbers[k] = characterNumberK;
            }


            /**
             * Prepare for next iteration in the secret
             * resolve process below here. End the
             * process if the current iteration is the
             * last iteration.
             */
            currentNumbers = resolveNumbers;

            calculationsIterationCount++;

            if (isLastIteration)
                break;
        }

        let secret = this.getNumbersAsCharacters(resolveNumbers);
        return secret;
    }

    /**
     * https://stackoverflow.com/questions/18230217/javascript-generate-a-random-number-within-a-range-using-crypto-getrandomvalues
     */
    getRandomIntWithCrypto(min, max) {
        const randomBuffer = new Uint32Array(1);

        window.crypto.getRandomValues(randomBuffer);

        let randomNumber = randomBuffer[0] / (0xffffffff + 1);

        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(randomNumber * (max - min + 1)) + min;
    }

}


class RecoverySet {
    constructor(participants, threshold) {
        this.participants = participants;
        this.threshold = threshold;
	}

    isThresholdReached() {
        return this.participants.length >= this.threshold;
    }

    hasParticipant(participant) {
        return this.participants.indexOf(participant) > -1;
    }

    appendParticipant(participant) {
        this.participants = this.participants + participant;
    }

    removeLastParticipant() {
        this.participants = this.participants.substring(0, this.participants.length - 1);
    }
}



